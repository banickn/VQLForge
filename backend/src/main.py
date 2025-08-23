# src/main.py
import logging
from fastapi import FastAPI

from src.api.router import api_router  # Import the main router
from src.config import settings  # To access settings if needed for app config
from src.db.session import engine as db_engine, init_db_engine  # To ensure DB is up
from src.utils.logging_config import setup_logging  # Import the new logging setup

# Configure logging using the new setup function
setup_logging()
logger = logging.getLogger(__name__)

# Initialize services
if not db_engine:
    logger.warning("Database engine not initialized on import. Attempting explicit init.")

    if init_db_engine() is None:
        logger.fatal("Application startup failed: Could not connect to the database.")
        exit(1)

app = FastAPI(
    title="VQLForge Backend",
    description="The backend to transpile and validate SQL to VQL",
    version="0.2",
)

# CORS is now handled by the NGINX reverse proxy.

# Include the main API router
app.include_router(api_router)

# A simple root endpoint can remain here or be moved to its own router


@app.get("/", tags=["Default"])
def read_root():
    return {"message": "Welcome to VQLForge Backend!"}
