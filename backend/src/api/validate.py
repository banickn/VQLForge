import logging
from fastapi import APIRouter
from src.schemas.validation import VqlValidateRequest, VqlValidationApiResponse
from src.services.validation_service import run_validation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/validate", response_model=VqlValidationApiResponse, tags=["VQL Forge"])
async def validate_vql_query_endpoint(request: VqlValidateRequest) -> VqlValidationApiResponse:
    """
    Validates a VQL query using the centralized validation service.
    """
    # The original request.sql is not needed here as we only validate the VQL.
    return await run_validation(vql_to_validate=request.vql)
