# src/main.py

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from src.api.router import api_router
from src.db.session import init_db_engine, engine
from src.utils.logging_config import setup_logging
from src.db.sqlite_session import init_sqlite_db

# Configure logging first
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    logger.info("Application startup...")

    # Initialize SQLite DB and tables
    init_sqlite_db()

    # Initialize the Denodo database engine
    if init_db_engine() is None:
        logger.fatal("Application startup failed: Could not connect to the Denodo database.")
        # The application will start but endpoints requiring the DB will fail.
        # This prevents a hard crash on startup.
    else:
        logger.info("Denodo DB engine initialized successfully.")

    yield

    # --- Shutdown Logic ---
    logger.info("Application shutdown...")
    if engine:
        engine.dispose()
        logger.info("Denodo DB engine disposed.")


app = FastAPI(
    title="VQLForge Backend",
    description="The backend to transpile and validate SQL to VQL",
    version="0.25",
    lifespan=lifespan  # Use the new lifespan manager
)

# Include the main API router
app.include_router(api_router)


@app.get("/", tags=["Default"])
def read_root():
    return {"message": "Welcome to VQLForge Backend!"}
