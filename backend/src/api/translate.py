"""
API endpoint for translating SQL queries to VQL.

This module provides a FastAPI route that accepts a source SQL query
and its dialect, and utilizes a backend translation service to convert it
into the equivalent VQL.
"""

import logging
from fastapi import APIRouter, HTTPException
from src.schemas.translation import SqlQueryRequest, TranslateApiResponse
from src.services.translation_service import run_translation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/translate", response_model=TranslateApiResponse, tags=["VQL Forge"])
async def translate_sql_to_vql(request: SqlQueryRequest) -> TranslateApiResponse:
    """Translate a source SQL string to VQL.

    This endpoint serves as a proxy to the centralized translation service,
    handling request validation, calling the service, and managing potential
    errors.

    Args:
        request: An object containing the source SQL string, the dialect
                 (e.g., "BigQuery", "Snowflake"), and the target VDB.

    Raises:
        HTTPException: A 500 Internal Server Error if the translation service
                       fails unexpectedly.

    Returns:
        A `TranslateApiResponse` object containing the resulting VQL or
        detailed error analysis if the translation was unsuccessful but
        handled gracefully by the service.
    """
    try:
        logger.info(
            f"Received translation request for dialect: {request.dialect}"
        )
        # The core translation logic is delegated to the service layer
        translation_result: TranslateApiResponse = await run_translation(
            source_sql=request.sql,
            dialect=request.dialect,
            vdb=request.vdb
        )
        return translation_result
    except Exception as e:
        # Log the full exception for debugging purposes
        logger.error(
            f"An unexpected error occurred during translation: {e}",
            exc_info=True
        )
        # Raise an HTTPException to return a structured error response to the client
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while translating the SQL query."
        )
