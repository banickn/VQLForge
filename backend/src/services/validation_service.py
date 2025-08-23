import logging
import asyncio
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError

from src.schemas.validation import VqlValidationApiResponse
from src.schemas.translation import AIAnalysis  # Import the unified error model
from src.utils.ai_analyzer import analyze_vql_validation_error
from src.db.session import get_engine

logger = logging.getLogger(__name__)


async def run_validation(vql_to_validate: str) -> VqlValidationApiResponse:
    """
    Validates a VQL query against the Denodo database.
    """
    engine = get_engine()
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection is not available. Check server logs.",
        )

    desc_query_plan_vql: str = f"DESC QUERYPLAN {vql_to_validate}"
    logger.info(f"Attempting to validate VQL (via DESC QUERYPLAN): {vql_to_validate[:100]}...")

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

        # Re-raise the exception caught in the thread
        raise result

    except (OperationalError, ProgrammingError) as e:
        db_error_message = str(getattr(e, "orig", e))
        logger.warning(f"Denodo VQL validation failed: {db_error_message}")
        try:
            # The result is now correctly typed as AIAnalysis
            ai_analysis_result: AIAnalysis = await analyze_vql_validation_error(db_error_message, vql_to_validate)
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
