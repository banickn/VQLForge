import logging
from sqlglot import parse_one
from sqlglot.errors import ParseError
from fastapi import HTTPException

from src.schemas.translation import TranslateApiResponse, AIAnalysis
from src.utils.ai_analyzer import analyze_sql_translation_error
from src.utils.vdb_transformer import transform_vdb_table_qualification
from src.utils.dual_transformer import transform_dual_function

logger = logging.getLogger(__name__)


async def run_translation(source_sql: str, dialect: str, vdb: str) -> TranslateApiResponse:
    """
    Translates a source SQL string to VQL, handling errors and transformations.
    """
    logger.debug(f"Running translation: dialect='{dialect}', vdb='{vdb}', SQL='{source_sql[:100]}...'")

    try:
        expression_tree = parse_one(source_sql, read=dialect)
        if vdb:  # Only apply transformation if vdb is provided
            expression_tree = expression_tree.transform(transform_vdb_table_qualification, vdb)
        if dialect == "oracle":
            expression_tree = expression_tree.transform(transform_dual_function)

        converted_vql = expression_tree.sql(dialect="denodo", pretty=True)
        logger.info(f"Successfully translated SQL to VQL. VQL: {converted_vql[:100]}...")
        return TranslateApiResponse(vql=converted_vql)

    except ParseError as pe:
        logger.warning(f"SQL Parsing Error during translation: {pe}", exc_info=True)
        try:
            ai_analysis_result: AIAnalysis = await analyze_sql_translation_error(str(pe), source_sql)
            return TranslateApiResponse(error_analysis=ai_analysis_result)
        except HTTPException as http_exc:
            raise http_exc
        except Exception as ai_err:
            logger.error(f"Error during AI analysis for translation parse error: {ai_err}", exc_info=True)
            return TranslateApiResponse(message=f"SQL parsing failed: {pe}. AI analysis also failed: {ai_err}")

    except Exception as e:
        logger.error(f"General Error during SQL translation: {e}", exc_info=True)
        return TranslateApiResponse(message=f"Translation failed due to an unexpected error: {str(e)}")
