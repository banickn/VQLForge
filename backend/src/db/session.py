"""
Database engine management for the application.

This module is responsible for creating, managing, and providing access to the
global SQLAlchemy engine that connects to the Denodo database. It includes
functions for initialization and retrieval of the engine instance.
"""

import logging
import sqlalchemy as db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Engine

from src.config import settings

logger = logging.getLogger(__name__)
engine: Engine | None = None


def init_db_engine() -> Engine | None:
    """Initialize the global SQLAlchemy database engine.

    This function attempts to create a SQLAlchemy engine using the DATABASE_URL
    from the application settings. It sets a global `engine` variable upon
    successful connection and a test query. It is intended to be called once
    at application startup.

    If the DATABASE_URL is not configured, or if a connection cannot be
    established due to a missing driver or other database errors, the
    function will log a fatal error and set the global engine to None.

    Returns:
        The created SQLAlchemy Engine instance on success, or None on failure.
    """
    global engine
    if settings.DATABASE_URL is None:
        logger.fatal("DATABASE_URL is not configured.")
        return None
    try:
        engine = db.create_engine(settings.DATABASE_URL)
        with engine.connect():
            logger.info("Successfully connected to Denodo.")
        return engine
    except ImportError as e:
        logger.fatal(f"Could not import Denodo driver. Make sure it's installed. ImportError: {e}")
        engine = None
        return None
    except SQLAlchemyError as e:
        logger.fatal(f"Could not connect to Denodo database: {e}")
        engine = None
        return None


def get_engine() -> Engine:
    """Retrieve the initialized SQLAlchemy database engine.

    This function provides access to the global engine instance. It is designed
    to be called from other parts of the application (e.g., to create sessions)
    after `init_db_engine` has been successfully executed.

    Raises:
        ConnectionError: If the database engine has not been initialized yet
                         (i.e., `init_db_engine` has not been called or has failed).

    Returns:
        The active SQLAlchemy Engine instance.
    """
    if engine is None:
        raise ConnectionError("Database engine is not initialized.")
    return engine
