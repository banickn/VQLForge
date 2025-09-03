"""
Core translation service for converting SQL to VQL.

This module contains the primary logic for the SQL-to-VQL translation process,
leveraging the `sqlglot` library for parsing and transformation. It also
integrates with an AI service to analyze and provide suggestions for
parsing errors.
"""

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
    """Translate a source SQL string to VQL, handling errors and transformations.

    This function orchestrates the end-to-end translation process. It first
    attempts to parse the source SQL using `sqlglot` according to the specified
    dialect. If successful, it applies a series of transformations:
    1.  Qualifies table names with the provided VDB, if any.
    2.  Applies Oracle-specific transformations for `DUAL` functions.

    If a `ParseError` occurs, it invokes an AI service to analyze the error
    and the source SQL, aiming to provide a meaningful explanation and a
    suggested fix.

    Args:
        source_sql: The raw SQL string to be translated.
        dialect: The dialect of the source SQL (e.g., "oracle", "bigquery").
        vdb: The name of the Virtual Database (VDB) to qualify table names with.
             If empty, no VDB transformation is applied.

    Returns:
        An object containing either the successfully generated VQL string or
        an `error_analysis` object with details from the AI service if parsing
        failed. In case of a catastrophic failure, a simple error message is
        returned.

    Raises:
        HTTPException: Re-raises any `HTTPException` that might occur during the
                       AI analysis sub-process, allowing it to be propagated to
                       the API layer.
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
