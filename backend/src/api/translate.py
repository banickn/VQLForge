import logging
import sqlglot
from sqlglot import parse_one
from sqlglot.errors import ParseError
from fastapi import APIRouter, HTTPException

from src.schemas.translation import SqlQueryRequest, TranslateApiResponse
from src.utils.ai_analyzer import analyze_sql_translation_error
from src.utils.vdb_transformer import transform_vdb_table_qualification
from src.schemas.translation import TranslationError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/translate", response_model=TranslateApiResponse, tags=["VQL Forge"])
def translate_sql_to_vql(request: SqlQueryRequest) -> TranslateApiResponse:
    source_sql = request.sql
    dialect: str = request.dialect
    vdb: str = request.vdb

    if not source_sql:
        raise HTTPException(status_code=400, detail="Missing 'sql' in request body")
    if not dialect:
        raise HTTPException(status_code=400, detail="Missing 'dialect' in request body")

    logger.debug(f"Translation request: dialect='{dialect}', vdb='{vdb}', SQL='{source_sql[:100]}...'")

    try:
        expression_tree = parse_one(source_sql, dialect=dialect)
        if vdb:  # Only apply transformation if vdb is provided
            expression_tree = expression_tree.transform(transform_vdb_table_qualification, vdb)
        converted_vql = expression_tree.sql(dialect="denodo", pretty=True)

        logger.info(f"Successfully translated SQL to VQL. VQL: {converted_vql[:100]}...")
        return TranslateApiResponse(vql=converted_vql)

    except ParseError as pe:
        logger.warning(f"SQL Parsing Error during translation: {pe}", exc_info=True)
        try:
            ai_analysis_result: TranslationError = analyze_sql_translation_error(str(pe), source_sql)
            return TranslateApiResponse(error_analysis=ai_analysis_result)
        except HTTPException as http_exc:  # AI service's own HTTPExceptions (e.g. API key)
            raise http_exc
        except Exception as ai_err:  # Other errors from AI service call
            logger.error(f"Error during AI analysis for translation parse error: {ai_err}", exc_info=True)
            return TranslateApiResponse(message=f"SQL parsing failed: {pe}. AI analysis also failed: {ai_err}")

    except Exception as e:
        logger.error(f"General Error during SQL translation: {e}", exc_info=True)
        # Optionally, try AI analysis for generic errors too, or just return a generic message
        return TranslateApiResponse(message=f"Translation failed due to an unexpected error: {str(e)}")
