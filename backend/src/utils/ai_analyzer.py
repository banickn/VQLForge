# src/services/ai_analyzer.py
import logging
from typing import Type
from fastapi import HTTPException
from pydantic_ai import Agent, RunContext

from src.config import settings
from src.schemas.translation import TranslationError
from src.schemas.validation import ValidationError
# Import the Denodo client functions
from src.utils.denodo_client import get_available_views_from_denodo, get_denodo_functions_list, get_vdb_names_list

logger = logging.getLogger(__name__)


def _initialize_ai_agent(system_prompt: str, output_type: Type) -> Agent:
    if not settings.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY environment variable not set.")
        raise HTTPException(
            status_code=500, detail="AI service configuration error: API key missing."
        )
    return Agent(
        # Consider making model name a config variable
        "gemini-2.5-flash-preview-04-17",  # "gemini-1.5-flash-latest" might be more current
        system_prompt=system_prompt,
        output_type=output_type,
        # llm_kwargs={"api_key": settings.GEMINI_API_KEY} # pydantic-ai typically handles GOOGLE_API_KEY env var directly
    )


def analyze_vql_validation_error(error: str, input_vql: str) -> ValidationError:
    agent = _initialize_ai_agent(
        "You are an SQL Validation assistant for Denodo VQL", ValidationError
    )

    @agent.tool
    def get_views(ctx: RunContext[str]) -> list[str]:
        # Potentially pass vdb context if available from the original request
        # For now, calling without specific VDB context for views
        return get_available_views_from_denodo()

    @agent.tool
    def get_denodo_functions(ctx: RunContext[str]) -> list[str]:
        return get_denodo_functions_list()

    @agent.tool
    def get_vdbs(ctx: RunContext[str]) -> list[str]:
        return get_vdb_names_list()

    prompt = f"""Analyze the Denodo VQL Validation error. Explain concisely why the `Input VQL` failed based on the `Error` and provide the corrected `Valid VQL Suggestion`.
                Do not use ```sql markdown for the corrected VQL response. Do not explain what you are doing, just provide the explanation and the suggestion directly.
                If the table/view is missing, use the get_views tool to determine which views are available and use the best guess in your suggestion.
                If a function is not valid, use get_denodo_functions tool to check for available Denodo functions.
                If a database name (VDB) is invalid, use get_vdbs tool to check for database names. Suggest one that is similar or advise the user to check.
                **ERROR:**
                {error}
                **Input VQL:**
                ```vql
                {input_vql}```"""
    try:
        response = agent.run_sync(prompt)
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
    # Add tools here if the translation assistant needs them (e.g., to understand target VQL features)

    prompt = f"""Analyze the SQL parsing/translation error. Explain concisely why the `Input SQL` failed based on the `Error` and provide a corrected `Valid SQL Suggestion` that would be parsable by the original dialect or a hint for VQL.
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
