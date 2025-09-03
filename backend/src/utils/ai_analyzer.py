# src/utils/ai_analyzer.py

import logging
from typing import Type, Set, List

from sqlalchemy.orm.query import Query
from sqlalchemy.sql.elements import BinaryExpression
from sqlalchemy.sql.schema import Column
from sqlglot import exp, parse_one
from fastapi import HTTPException
from pydantic_ai import Agent, RunContext, Tool
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.azure import AzureProvider

from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import or_

from src.db.sqlite_session import get_sqlite_session
from src.schemas.db_log import AcceptedQuery

from src.config import settings
from src.schemas.translation import AIAnalysis
from src.schemas.validation import VqlValidateRequest
from src.utils.denodo_client import get_available_views_from_denodo, get_denodo_functions_list, get_vdb_names_list, get_view_cols

logger = logging.getLogger(__name__)


@dataclass
class Deps:
    tables: set[str]
    vdb: str
    sql: str
    dialect: str


def _initialize_ai_agent(system_prompt: str, output_type: Type, tools: list[Tool] = []) -> Agent:
    if settings.OPENAI_API_KEY:
        logger.info("Using OpenAI model.")
        model = OpenAIModel(
            settings.AI_MODEL_NAME,
            provider=AzureProvider(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_version='2024-12-01-preview',
                api_key=settings.OPENAI_API_KEY,
            )
        )
    elif settings.GEMINI_API_KEY:
        logger.info("Using Gemini model.")
        model = GoogleModel(settings.AI_MODEL_NAME,
                            provider=GoogleProvider(api_key=settings.GEMINI_API_KEY))
    else:
        logger.error("NO AI KEY environment variable set.")
        raise HTTPException(
            status_code=500, detail="AI service configuration error: API key missing."
        )

    return Agent(
        model,
        system_prompt=system_prompt,
        output_type=output_type,
        deps_type=Deps,
        tools=tools
    )


async def get_history_query_list(sql: str, tables: Set[str], dialect: str) -> List[str]:
    """
    Retrieves historical VQL queries from the database based on table names.
    This function now directly queries the SQLite database.
    """
    if not tables:
        return []

    # Manually obtain and manage a database session for this function
    db: Session = get_sqlite_session()
    try:
        conditions: List[BinaryExpression[bool]] = [AcceptedQuery.tables.like(f'%"{table}"%') for table in tables]

        # Combine conditions with OR logic and execute the query
        query: Query[AcceptedQuery] = db.query(AcceptedQuery).filter(or_(*conditions))

        if dialect:
            query = query.filter(AcceptedQuery.source_dialect == dialect)

        query = query.order_by(AcceptedQuery.timestamp.desc()).limit(10)

        history_vqls: List[dict[str, Column[str]]] = [
            {"source_sql": log.source_sql, "target_vql": log.target_vql}
            for log in query.all()
            if log.source_sql and log.target_vql]
        return history_vqls
    except Exception as e:
        logger.error(f"Failed to retrieve history queries from DB for tables {tables}: {e}", exc_info=True)
        return []
    finally:
        db.close()


async def _get_history(ctx: RunContext[Deps]) -> list[str]:
    """Retrieves a list of correct translation and validation of queries. Use this tool always first to find already successful query translations."""
    logger.info("Executing _get_history_query_list tool")
    return await get_history_query_list(ctx.deps.sql, ctx.deps.tables, ctx.deps.dialect)


async def _get_functions() -> list[str]:
    """Retrieves a list of available Denodo functions. Use this tool when an error indicates a function was not found or has incorrect arity."""
    logger.info("Executing _get_functions tool")
    return await get_denodo_functions_list()


async def _get_views(ctx: RunContext[Deps]) -> list[str]:
    """Retrieves a list of available Denodo views. Use this tool when an error suggests a table or view is missing or misspelled."""
    return await get_available_views_from_denodo(ctx.deps.vdb)


async def _get_vdbs() -> list[str]:
    """Retrieves a list of available Denodo Virtual DataBases (VDBs). Use this tool when an error refers to an invalid database name."""
    return await get_vdb_names_list()


async def _get_view_metadata(ctx: RunContext[Deps]) -> list[dict[str, str]]:
    """Retrieves a list of columns for the views. Use this tool when an error refers to field not found in view error."""
    return await get_view_cols(ctx.deps.tables)


def _extract_tables(input_vql: str) -> set[str]:
    tables = set()
    try:
        for table in parse_one(input_vql).find_all(exp.Table):
            tables.add(table.name)
    except Exception:
        # Ignore parsing errors here, as the input might be invalid VQL
        pass
    return tables


async def analyze_vql_validation_error(error: str, request: VqlValidateRequest) -> AIAnalysis:
    agent = _initialize_ai_agent(
        "You are an SQL Validation assistant for Denodo VQL", AIAnalysis, tools=[
            Tool(_get_functions), Tool(_get_views), Tool(_get_vdbs), Tool(_get_view_metadata), Tool(_get_history)]
    )

    prompt: str = f"""You are an expert Denodo VQL Assistant. Your task is to analyze Denodo VQL validation errors.
                1.  Categorize the error into one of the following types: "Missing View", "Missing Column", "Invalid Function", "Syntax Error", "Permissions Error", "Other". Set this category in the `error_category` field.
                2.  Explain concisely in the `explanation` field why the `Input VQL` failed based on the `Error`.
                3.  Provide an accurate, corrected VQL suggestion in the `sql_suggestion` field.

                Do not explain what you are doing in the explanation, just provide the direct cause of the error.
                At first always check the _get_history tool if the same or similar query was already successfully translated and validated.
                If a table/view is missing, use the _get_views tool to find available views and suggest a likely replacement.
                If a function is not found, use the _get_functions tool to check for available Denodo functions.
                If a database name (VDB) is invalid, use _get_vdbs tool to check for valid database names.

                **ERROR:**
                {error}

                **Input VQL:**
                ```vql
                {request.vql}```"""
    vql_tables: set[str] = _extract_tables(request.vql)
    deps = Deps(tables=vql_tables, vdb=request.vdb, sql=request.sql, dialect=request.dialect)
    try:
        response = await agent.run(prompt, deps=deps)
        if response and response.output:
            sql_suggestion = parse_one(response.output.sql_suggestion).sql(pretty=True)
            response.output.sql_suggestion = sql_suggestion
            logger.info(f"AI Validation Analysis Category: {response.output.error_category}")
            logger.info(f"AI Validation Analysis Explanation: {response.output.explanation}")
            logger.info(f"AI Validation Analysis Suggestion: {response.output.sql_suggestion}")
            return response.output
        else:
            logger.error(f"AI agent returned unexpected response for validation: {response}")
            raise HTTPException(
                status_code=503, detail="AI service returned an invalid response for validation."
            )
    except Exception as agent_error:
        logger.error(f"Error calling AI Agent for validation: {agent_error}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"AI service for validation unavailable or failed: {agent_error}"
        )


async def analyze_sql_translation_error(exception_message: str, input_sql: str) -> AIAnalysis:
    agent = _initialize_ai_agent(
        "You are an SQL Translation assistant, focusing on transpiling to Denodo VQL", AIAnalysis
    )

    prompt = f"""Analyze the SQL parsing/translation error.
                1. Categorize the error as "Translation Syntax Error". Set this in the `error_category` field.
                2. Explain concisely in the `explanation` field why the `Input SQL` failed based on the `Error`.
                3. Provide a corrected `Valid SQL Suggestion` in the `sql_suggestion` field that would be parsable by the original dialect or a hint for VQL.

                Do not use ```sql markdown for the corrected SQL response. Do not explain what you are doing, just provide the explanation and the suggestion directly.

                **ERROR:**
                {exception_message}

                **Input SQL:**
                ```sql
                {input_sql}```"""
    try:
        response = await agent.run(prompt)
        if response and response.output:
            logger.info(f"AI Translation Analysis Explanation: {response.output.explanation}")
            logger.info(f"AI Translation Analysis Suggestion: {response.output.sql_suggestion}")
            return response.output
        else:
            logger.error(f"AI agent returned unexpected response for translation: {response}")
            raise HTTPException(
                status_code=503, detail="AI service returned an invalid response for translation."
            )
    except Exception as agent_error:
        logger.error(f"Error calling AI Agent for translation: {agent_error}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"AI service for translation unavailable or failed: {agent_error}"
        )


async def explain_vql_differences(source_sql: str, source_dialect: str, final_vql: str) -> str:
    """
    Uses an AI agent to analyze and explain the differences between a source SQL query
    and its translated VQL counterpart.
    """
    agent = _initialize_ai_agent(
        "You are an expert in SQL dialects and Denodo VQL. Your task is to explain the differences between a source SQL query and its translated VQL counterpart.",
        AIAnalysis
    )

    prompt = f"""Analyze the differences between the source SQL and the final VQL.
                1.  In the `explanation` field, provide a concise, Markdown-formatted bulleted list (using '-') explaining the key transformations that were applied.
                2.  Focus on syntax changes, function replacements, and structural modifications (like adding a database name to a table).
                3.  Keep the explanation clear and easy for a developer to understand.
                4.  If there are no significant changes, state that the VQL is a direct equivalent.
                5.  Do not populate the `sql_suggestion` or `error_category` fields.

                **Source SQL ({source_dialect}):**
                ```sql
                {source_sql}
                ```

                **Final VQL:**
                ```vql
                {final_vql}
                ```
                """
    try:
        response = await agent.run(prompt)
        if response and response.output and response.output.explanation:
            explanation_text = response.output.explanation
            logger.info(f"AI VQL Diff Explanation generated: {explanation_text[:150]}...")
            return explanation_text
        else:
            logger.error(f"AI agent returned unexpected response for VQL diff explanation: {response}")
            return "AI analysis of the VQL differences failed to produce an explanation."
    except Exception as agent_error:
        logger.error(f"Error calling AI Agent for VQL diff explanation: {agent_error}", exc_info=True)
        # Return a user-friendly error message, not the raw exception
        return "An error occurred while generating the explanation of VQL differences."
