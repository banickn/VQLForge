import logging
from typing import Type
from sqlglot import exp, parse_one
from fastapi import HTTPException
from pydantic_ai import Agent, RunContext, Tool

from src.config import settings
from src.schemas.translation import TranslationError
from src.schemas.validation import ValidationError
# Import the Denodo client functions
from src.utils.denodo_client import get_available_views_from_denodo, get_denodo_functions_list, get_vdb_names_list, get_view_cols

logger = logging.getLogger(__name__)


def _initialize_ai_agent(system_prompt: str, output_type: Type, tools: list[Tool] = []) -> Agent:
    if not settings.GEMINI_API_KEY:
        logger.error("AI_API_KEY environment variable not set.")
        raise HTTPException(
            status_code=500, detail="AI service configuration error: API key missing."
        )

    return Agent(
        settings.AI_MODEL_NAME,
        system_prompt=system_prompt,
        output_type=output_type,
        deps_type=set[str],
        tools=tools
    )


def _get_functions() -> list[str]:
    """Retrieves a list of available Denodo functions. Use this tool when an error indicates a function was not found or has incorrect arity."""
    logger.info("Executing _get_functions tool")
    return get_denodo_functions_list()


def _get_views() -> list[str]:
    """Retrieves a list of available Denodo views. Use this tool when an error suggests a table or view is missing or misspelled."""
    return get_available_views_from_denodo()


def _get_vdbs() -> list[str]:
    """Retrieves a list of available Denodo Virtual DataBases (VDBs). Use this tool when an error refers to an invalid database name."""
    return get_vdb_names_list()


def _get_view_metadata(ctx: RunContext[set[str]]) -> list[dict[str, str]]:
    """Retrieves a list of columns for the views. Use this tool when an error refers to field not found in view error."""
    return get_view_cols(ctx.deps)


def _extract_tables(input_vql: str) -> set[str]:
    tables = set()
    for table in parse_one(input_vql).find_all(exp.Table):
        tables.add(table.name)
    return tables


def analyze_vql_validation_error(error: str, input_vql: str) -> ValidationError:

    agent = _initialize_ai_agent(
        "You are an SQL Validation assistant for Denodo VQL", ValidationError, tools=[
            Tool(_get_functions), Tool(_get_views), Tool(_get_vdbs), Tool(_get_view_metadata)]
    )

    prompt: str = f"""You are an expert Denodo VQL Assistant. Your primary goal is to analyze Denodo VQL validation errors, explain them concisely, and provide accurate, corrected VQL suggestions.
                Explain concisely why the `Input VQL` failed based on the `Error` and provide the corrected `Valid VQL Suggestion`.
                Do not explain what you are doing, just provide the explanation and the suggestion directly.

                If the table/view is missing, use the _get_views tool to determine which views are available and use the best guess in your suggestion.
                If you get a 'Function <placeholder> with arity not found' exception, use _get_functions tool to check for available Denodo functions.
                If a database name (VDB) is invalid, use _get_vdbs tool to check for database names. Suggest one that is similar or advise the user to check.
                **ERROR:**
                {error}
                **Input VQL:**
                ```vql
                {input_vql}```"""
    vql_tables: set[str] = _extract_tables(input_vql)
    try:
        response = agent.run_sync(prompt, deps=vql_tables)
        if response and response.output:
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


def analyze_sql_translation_error(exception_message: str, input_sql: str) -> TranslationError:
    agent = _initialize_ai_agent(
        "You are an SQL Translation assistant, focusing on transpiling to Denodo VQL", TranslationError
    )

    prompt = f"""Analyze the SQL parsing/translation error.
                Explain concisely why the `Input SQL` failed based on the `Error` and provide a corrected `Valid SQL Suggestion` that would be parsable by the original dialect or a hint for VQL.
                Do not use ```sql markdown for the corrected SQL response. Do not explain what you are doing, just provide the explanation and the suggestion directly.
                **ERROR:**
                {exception_message}
                **Input SQL:**
                ```sql
                {input_sql}```"""
    try:
        response = agent.run_sync(prompt)
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
