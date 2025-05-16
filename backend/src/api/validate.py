# src/api/endpoints/validate.py
import logging
from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError

from src.schemas.validation import VqlValidateRequest, VqlValidationApiResponse
from src.utils.ai_analyzer import analyze_vql_validation_error
from src.db.session import get_engine  # Use the centralized engine

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/validate", response_model=VqlValidationApiResponse, tags=["VQL Forge"])
def validate_vql_query_endpoint(request: VqlValidateRequest) -> VqlValidationApiResponse:
    engine = get_engine()  # Get engine, will raise ConnectionError if not init
    if engine is None:  # Should be caught by get_engine, but as a safeguard
        raise HTTPException(
            status_code=503,
            detail="Database connection is not available. Check server logs.",
        )

    # The original request.sql might be the SQL that was translated to VQL.
    # The request.vql is what we are validating.
    # For AI analysis, we probably want to pass the VQL that failed.
    desc_query_plan_vql: str = f"DESC QUERYPLAN {request.vql}"
    logger.info(f"Attempting to validate VQL (via DESC QUERYPLAN): {request.vql[:100]}...")

    try:
        with engine.connect() as connection:
            # DESC QUERYPLAN doesn't return rows on success, just executes
            connection.execute(text(desc_query_plan_vql))
        logger.info("VQL validation successful via DESC QUERYPLAN.")
        return VqlValidationApiResponse(
            validated=True,
            message="VQL syntax check successful!",
        )
    except (OperationalError, ProgrammingError) as e:
        db_error_message = str(getattr(e, "orig", e))  # Get specific DB error
        logger.warning(f"Denodo VQL validation failed: {db_error_message}")
        try:
            ai_analysis_result = analyze_vql_validation_error(db_error_message, request.vql)
            return VqlValidationApiResponse(
                validated=False, error_analysis=ai_analysis_result
            )
        except HTTPException as http_exc:  # AI service's own HTTPExceptions
            logger.error(f"AI analysis failed during validation handling: {http_exc.detail}")
            raise http_exc  # Re-raise if it's an issue like API key
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
