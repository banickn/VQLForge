import logging
from fastapi import APIRouter
from src.schemas.translation import SqlQueryRequest, TranslateApiResponse
from src.services.translation_service import run_translation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/translate", response_model=TranslateApiResponse, tags=["VQL Forge"])
async def translate_sql_to_vql(request: SqlQueryRequest) -> TranslateApiResponse:
    """
    Translates a source SQL string to VQL using the centralized translation service.
    """
    return await run_translation(
        source_sql=request.sql,
        dialect=request.dialect,
        vdb=request.vdb
    )
