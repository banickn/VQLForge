"""
API endpoints for logging and retrieving validated SQL-to-VQL query pairs.

This module provides routes to log accepted queries and to retrieve those logs
based on various filtering criteria, such as the tables they reference.
"""

import json
import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, column, String
from sqlalchemy.orm import Session
from sqlalchemy.sql.selectable import LateralFromClause
from sqlglot import exp, parse_one

# Assuming these schemas are defined in the specified paths
from src.schemas.db_log import (
    AcceptedQuery,
    AcceptedQueryLogListResponse,
    AcceptedQueryLogRequest,
)
from src.db.sqlite_session import get_sqlite_session
logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/log/accepted", status_code=201, tags=["Logging"])
async def log_accepted_query(request: AcceptedQueryLogRequest,
                             db: Session = Depends(get_sqlite_session)) -> dict[str, Any]:
    """Log a successfully validated and accepted SQL-to-VQL pair.

    This endpoint uses sqlglot to parse the source SQL, extracts the table
    names, and stores the entire entry in the database.

    Args:
        request: The request body containing the source SQL, dialect, and target VQL.
        db: The SQLAlchemy database session, injected as a dependency.

    Raises:
        HTTPException: A 500 error if the database write operation fails.

    Returns:
        A confirmation message and the ID of the newly created log entry.
    """
    try:
        source_tables = json.dumps([table.name for table in parse_one(request.source_sql).find_all(exp.Table)])

        db_log_entry = AcceptedQuery(
            source_sql=request.source_sql,
            source_dialect=request.source_dialect,
            target_vql=request.target_vql,
            tables=source_tables
        )
        db.add(db_log_entry)
        db.commit()
        db.refresh(db_log_entry)
        logger.info(f"Successfully logged accepted query ID: {db_log_entry.id}")
        return {"message": "Log entry created successfully.", "id": db_log_entry.id}
    except Exception as e:
        logger.error(f"Failed to log accepted query: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to write log to database: {str(e)}")


@router.get("/log/all", response_model=AcceptedQueryLogListResponse, tags=["Logging"])
async def get_all_logs(db: Session = Depends(get_sqlite_session)) -> AcceptedQueryLogListResponse:
    """Retrieve all accepted query logs from the database.
    The logs are ordered by timestamp, with the most recent entries first.

    Args:
        db: The SQLAlchemy database session, injected as a dependency.

    Raises:
        HTTPException: A 500 error if the database read operation fails.

    Returns:
        A response object containing a list of all log entries.
    """
    try:
        logs: List[AcceptedQuery] = db.query(AcceptedQuery).order_by(AcceptedQuery.timestamp.desc()).all()
        return AcceptedQueryLogListResponse(results=logs)
    except Exception as e:
        logger.error(f"Failed to fetch all logs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve logs from the database.")
    finally:
        db.close()


@router.get("/log/filter", response_model=AcceptedQueryLogListResponse, tags=["Logging"])
async def get_logs_by_tables(
    tables: List[str] = Query(
        ...,
        description="A list of table names to filter by.",
        example=["customers", "orders"],
    ),
    db: Session = Depends(get_sqlite_session),
) -> AcceptedQueryLogListResponse:
    """Retrieve logs by tables using a correctly formed lateral subquery.

    This function filters records where the 'tables' JSON array contains any of
    the specified table names. It works by creating a LATERAL subquery that
    unnests the JSON array for each row and checks for a match. This is the
    idiomatic SQLAlchemy approach for this type of query against SQLite.

    Args:
        tables: A list of table names provided as query parameters.
        db: The SQLAlchemy database session.

    Raises:
        HTTPException: 400 if 'tables' is empty.
        HTTPException: 500 if the database query fails.

    Returns:
        A response object containing matching log entries.
    """
    if not tables:
        raise HTTPException(
            status_code=400, detail="The 'tables' query parameter cannot be empty."
        )

    try:
        # 1. Explicitly define the output columns of the `json_each` function.
        #    We only need the 'value' column, which contains the table names.
        json_table_def = func.json_each(AcceptedQuery.tables).table_valued(
            column("value", String),
            name="json_table"
        )

        # 2. Create the correlated EXISTS subquery.
        #    Because we defined the columns, accessing `.c.value` now works
        #    correctly and returns a Column object with the `.in_()` method.
        subquery = (
            select(1)
            .where(json_table_def.c.value.in_(tables))
        ).exists()

        # 3. Apply the filter to the main query.
        query = (
            db.query(AcceptedQuery)
            .filter(subquery)
            .order_by(AcceptedQuery.timestamp.desc())
            .limit(10)
        )

        logs: List[AcceptedQuery] = query.all()
        return AcceptedQueryLogListResponse(results=logs)
    except Exception as e:
        logger.error(f"Failed to fetch logs by tables: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to retrieve logs from the database."
        )
