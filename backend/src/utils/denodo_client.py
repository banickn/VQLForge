import logging
from fastapi import HTTPException
from sqlalchemy import Engine, text
from src.db.session import get_engine  # Use the centralized engine

logger = logging.getLogger(__name__)


def get_available_views_from_denodo(vdb_name: str | None = None) -> list[str]:
    engine: Engine = get_engine()
    vql = "SELECT database_name, name FROM get_views()"
    try:
        with engine.connect() as connection:
            result = connection.execute(text(vql))
            views: list[dict[str, str]] = [dict(row._mapping) for row in result]
            logger.info(f"Successfully retrieved Denodo functions: {len(views)} functions found.")
            return views
    except Exception as e:
        logger.error(f"Error executing VQL query '{vql}' to get views: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve views from Denodo: {str(e)}",
        )


def get_denodo_functions_list() -> list[str]:
    engine = get_engine()
    vql = "LIST FUNCTIONS"
    try:
        with engine.connect() as connection:
            result = connection.execute(text(vql))
            functions: list[str] = [row[2] for row in result if len(row) > 2]  # Added safety for row length
            logger.info(f"Successfully retrieved Denodo functions: {len(functions)} functions found.")
            return functions
    except Exception as e:
        logger.error(f"Error executing VQL query '{vql}' to get functions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve functions from Denodo: {str(e)}",
        )


def get_vdb_names_list() -> list[str]:
    engine = get_engine()
    vql = "SELECT db_name FROM GET_DATABASES()"
    try:
        with engine.connect() as connection:
            result = connection.execute(text(vql))
            db_names: list[str] = [row.db_name for row in result]
            logger.info(f"Successfully retrieved VDB names: {db_names}")
            return db_names
    except Exception as e:
        logger.error(f"Error executing VQL query '{vql}' to get VDBs: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve VDB list from the database: {str(e)}",
        )


def get_view_cols(tables: list[str]) -> list[dict[str, str]]:
    if not tables:
        logger.info("No tables provided to get_view_cols, returning empty list.")
        return []

    engine = get_engine()
    tables_in_clause: str = ",".join(f"'{s}'" for s in tables)
    vql: str = f"select view_name, column_name, column_sql_type from GET_view_columns() where view_name in ({tables_in_clause})"
    try:
        with engine.connect() as connection:
            result = connection.execute(text(vql))
            column_details: list[dict[str, str]] = [dict(row._mapping) for row in result]
            logger.info(f"Successfully retrieved view cols")
            return column_details
    except Exception as e:
        logger.error(f"Error executing VQL query '{vql}' to get view columns: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve view column details from the database: {str(e)}",
        )
