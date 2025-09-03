"""Validates VQL queries against a Denodo server."""

import logging
import asyncio
from fastapi import HTTPException
import re
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError

from src.schemas.validation import VqlValidationApiResponse, VqlValidateRequest
from src.schemas.translation import AIAnalysis
from src.utils.ai_analyzer import analyze_vql_validation_error
from src.db.session import get_engine

logger = logging.getLogger(__name__)


async def run_validation(request: VqlValidateRequest) -> VqlValidationApiResponse:
    """Validates a VQL query using a `DESC QUERYPLAN` statement.

    This check is run in a separate thread to avoid blocking. If validation
    fails, an AI service is called to analyze the error.

    Args:
        request: The VQL and its original SQL context.

    Returns:
        A validation response, with AI analysis on failure.

    Raises:
        HTTPException: If the database connection is unavailable.
    """
    engine = get_engine()
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection is not available. Check server logs.",
        )
    # DESC QUERYPLAN throws a syntax error when the query has LIMIT
    limit_match = re.search(r"LIMIT\s+\d+", request.vql)
    if limit_match:
        vql_without_limit = request.vql[:limit_match.start()]
        desc_query_plan_vql: str = f"DESC QUERYPLAN {vql_without_limit}"
    else:
        desc_query_plan_vql: str = f"DESC QUERYPLAN {request.vql}"
    logger.info(f"Attempting to validate VQL (via DESC QUERYPLAN): {request.vql[:100]}...")

    # This synchronous function is executed in a separate thread to prevent blocking.
    def db_call():
        try:
            with engine.connect() as connection:
                connection.execute(text(desc_query_plan_vql))
            return None  # Success case
        except (OperationalError, ProgrammingError) as e:
            return e  # Return exception to be handled in async context
        except SQLAlchemyError as e:
            return e
        except Exception as e:
            return e

    try:
        result = await asyncio.to_thread(db_call)
        if result is None:
            logger.info("VQL validation successful via DESC QUERYPLAN.")
            return VqlValidationApiResponse(
                validated=True,
                message="VQL syntax check successful!",
            )

        raise result

    except (OperationalError, ProgrammingError) as e:
        db_error_message = str(getattr(e, "orig", e))
        logger.warning(f"Denodo VQL validation failed: {db_error_message}")
        try:
            ai_analysis_result: AIAnalysis = await analyze_vql_validation_error(db_error_message, request)
            return VqlValidationApiResponse(
                validated=False, error_analysis=ai_analysis_result
            )
        except HTTPException as http_exc:
            logger.error(f"AI analysis failed during validation handling: {http_exc.detail}")
            raise http_exc
        except Exception as ai_err:
            logger.error(f"Unexpected error during AI validation analysis: {ai_err}", exc_info=True)
            return VqlValidationApiResponse(
                validated=False,
                message=f"Validation Failed: {db_error_message}. AI analysis also encountered an error: {ai_err}",
            )
    except SQLAlchemyError as e:
        logger.error(f"Database connection/SQLAlchemy error during validation: {e}", exc_info=True)
        return VqlValidationApiResponse(
            validated=False, message=f"Database error during validation: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during VQL validation: {e}", exc_info=True)
        return VqlValidationApiResponse(
            validated=False, message=f"An unexpected error occurred: {str(e)}"
        )
