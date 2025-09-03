"""
Manages the connection and session for the application's SQLite database.

This module is responsible for initializing the SQLite database engine, ensuring
the database file and necessary tables exist, and providing a mechanism for
FastAPI endpoints to acquire a database session for logging purposes.
"""

import logging
import os  # <-- Import the os module
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from sqlalchemy.orm.session import Session
from src.config import settings
from src.schemas.db_log import Base

logger = logging.getLogger(__name__)

sqlite_engine: Engine | None = None


def init_sqlite_db() -> None:
    """Initialize the global SQLite database engine and create tables.

    This function performs the following setup actions:
    1. Reads the database file path from the application settings.
    2. Ensures the directory for the database file exists, creating it if necessary.
    3. Creates a global SQLAlchemy engine for the SQLite database.
    4. Sets `check_same_thread` to False, which is required for using SQLite in a
       multi-threaded environment like FastAPI.
    5. Creates all tables defined in the SQLAlchemy declarative `Base` metadata.

    This function should be called once at application startup to prepare the
    database for use. If it fails, it logs a fatal error, and the engine will
    remain `None`.
    """
    global sqlite_engine
    try:
        # ensure the directory exists
        db_path: str = settings.SQLITE_DB_PATH
        db_directory: str = os.path.dirname(db_path)
        if db_directory:  # Ensure there is a directory part to the path
            os.makedirs(db_directory, exist_ok=True)
            logger.info(f"Ensured database directory exists at: {db_directory}")

        sqlite_engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},  # Required for SQLite with FastAPI
        )
        # Create tables
        Base.metadata.create_all(bind=sqlite_engine)
        logger.info(f"Successfully connected to SQLite DB at {db_path} and ensured tables exist.")
    except Exception as e:
        logger.fatal(f"Could not connect to or initialize SQLite database: {e}", exc_info=True)
        sqlite_engine = None


def get_sqlite_session() -> Session:
    """Create and return a new SQLAlchemy session for the SQLite database.

    This function is intended to be used as a FastAPI dependency to provide
    a database session to an API endpoint. It relies on the global `sqlite_engine`
    having been successfully initialized by `init_sqlite_db`.

    Note: This function creates and returns a new session. In a typical FastAPI
    pattern, the endpoint that receives this session is responsible for closing it
    (e.g., within a `finally` block) to prevent resource leaks. A generator-based
    dependency (`yield session`) is often preferred for automatic session cleanup.

    Raises:
        ConnectionError: If the SQLite database engine has not been
                         initialized before this function is called.

    Returns:
        A new SQLAlchemy `Session` instance connected to the SQLite database.
    """
    if sqlite_engine is None:
        raise ConnectionError("SQLite database engine is not initialized.")
    SessionLocal: sessionmaker[Session] = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)
    return SessionLocal()
