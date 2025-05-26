import logging
from fastapi import HTTPException
from sqlalchemy import text
from src.db.session import get_engine  # Use the centralized engine

logger = logging.getLogger(__name__)


def get_available_views_from_denodo(vdb_name: str | None = None) -> list[str]:
    # This needs actual implementation to query Denodo's metadata.
    # Example: "LIST VIEWS ALL" or query information_schema views
    # For now, returning a placeholder
    logger.warning("get_available_views_from_denodo is using placeholder data.")
    return ["placeholder_view1", f"placeholder_view_in_{vdb_name}" if vdb_name else "placeholder_view2"]


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
