import logging
from typing import Type
from sqlglot import exp, parse_one
from fastapi import HTTPException
from pydantic_ai import Agent, RunContext, Tool
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.azure import AzureProvider

from src.config import settings
from src.schemas.translation import AIAnalysis
from src.utils.denodo_client import get_available_views_from_denodo, get_denodo_functions_list, get_vdb_names_list, get_view_cols

logger = logging.getLogger(__name__)


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
        deps_type=set[str],
        tools=tools
    )


async def _get_functions() -> list[str]:
    """Retrieves a list of available Denodo functions. Use this tool when an error indicates a function was not found or has incorrect arity."""
    logger.info("Executing _get_functions tool")
    return await get_denodo_functions_list()


async def _get_views() -> list[str]:
    """Retrieves a list of available Denodo views. Use this tool when an error suggests a table or view is missing or misspelled."""
    return await get_available_views_from_denodo()


async def _get_vdbs() -> list[str]:
    """Retrieves a list of available Denodo Virtual DataBases (VDBs). Use this tool when an error refers to an invalid database name."""
    return await get_vdb_names_list()


async def _get_view_metadata(ctx: RunContext[set[str]]) -> list[dict[str, str]]:
    """Retrieves a list of columns for the views. Use this tool when an error refers to field not found in view error."""
    return await get_view_cols(ctx.deps)


def _extract_tables(input_vql: str) -> set[str]:
    tables = set()
    try:
        for table in parse_one(input_vql).find_all(exp.Table):
            tables.add(table.name)
    except Exception:
        # Ignore parsing errors here, as the input might be invalid VQL
        pass
    return tables


async def analyze_vql_validation_error(error: str, input_vql: str) -> AIAnalysis:
    agent = _initialize_ai_agent(
        "You are an SQL Validation assistant for Denodo VQL", AIAnalysis, tools=[
            Tool(_get_functions), Tool(_get_views), Tool(_get_vdbs), Tool(_get_view_metadata)]
    )

    prompt: str = f"""You are an expert Denodo VQL Assistant. Your task is to analyze Denodo VQL validation errors.
                1.  Categorize the error into one of the following types: "Missing View", "Missing Column", "Invalid Function", "Syntax Error", "Permissions Error", "Other". Set this category in the `error_category` field.
                2.  Explain concisely in the `explanation` field why the `Input VQL` failed based on the `Error`.
                3.  Provide an accurate, corrected VQL suggestion in the `sql_suggestion` field.

                Do not explain what you are doing in the explanation, just provide the direct cause of the error.

                If a table/view is missing, use the _get_views tool to find available views and suggest a likely replacement.
                If a function is not found, use the _get_functions tool to check for available Denodo functions.
                If a database name (VDB) is invalid, use _get_vdbs tool to check for valid database names.

                **ERROR:**
                {error}

                **Input VQL:**
                ```vql
                {input_vql}```"""
    vql_tables: set[str] = _extract_tables(input_vql)
    try:
        response = await agent.run(prompt, deps=vql_tables)
        if response and response.output:
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
