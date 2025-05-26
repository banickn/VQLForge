from fastapi import APIRouter, status
from src.schemas.common import HealthCheck

router = APIRouter()


@router.get(
    "/health",
    tags=["healthcheck"],
    summary="Perform a Health Check",
    response_description="Return HTTP Status Code 200 (OK)",
    status_code=status.HTTP_200_OK,
    response_model=HealthCheck,
)
def get_health_status() -> HealthCheck:
    return HealthCheck(status="OK")
