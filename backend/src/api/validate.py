"""
API endpoint for validating VQL queries.

This module exposes a FastAPI route that allows clients to submit a VQL query,
along with its original source SQL context, for validation against a
centralized service.
"""

import logging
from fastapi import APIRouter, HTTPException
from src.schemas.validation import VqlValidateRequest, VqlValidationApiResponse
from src.services.validation_service import run_validation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/validate", response_model=VqlValidationApiResponse, tags=["VQL Forge"])
async def validate_vql_query(request: VqlValidateRequest) -> VqlValidationApiResponse:
    """Validate a VQL query against its original SQL context.

    This endpoint delegates the validation logic to the centralized `run_validation`
    service. It handles the API request/response cycle and manages any
    unexpected errors that may occur during the validation process.

    Args:
        request: A `VqlValidateRequest` object containing the VQL to validate,
                 as well as the original source SQL, dialect, and VDB for
                 contextual validation.

    Raises:
        HTTPException: A 500 Internal Server Error if the validation service
                       encounters an unexpected failure.

    Returns:
        A `VqlValidationApiResponse` object indicating whether the VQL is
        valid and providing detailed error analysis if it is not.
    """

    try:
        logger.info(f"Received VQL validation request for dialect '{request.dialect}'.")

        # The entire request object is passed to the service, which may use
        # the source SQL and other context for a more comprehensive validation.
        validation_result: VqlValidationApiResponse = await run_validation(request=request)
        return validation_result
    except Exception as e:
        # Log the full exception details for debugging purposes
        logger.error(
            f"An unexpected error occurred during VQL validation: {e}",
            exc_info=True
        )
        # Return a standardized error response to the client
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while validating the VQL query."
        )
