# src/main.py
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.router import api_router  # Import the main router
from src.config import settings  # To access settings if needed for app config
from src.db.session import engine as db_engine, init_db_engine  # To ensure DB is up

# Configure logging
logging.basicConfig(level=logging.INFO)  # You can make level configurable via settings
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
    version="1.0.0",
)

# --- CORS Configuration ---
origins = [
    "http://localhost:4999",
    "http://127.0.0.1:4999",
    # Add production frontend origins here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- End CORS Configuration ---

# Include the main API router
app.include_router(api_router)

# A simple root endpoint can remain here or be moved to its own router


@app.get("/", tags=["Default"])
def read_root():
    return {"message": "Welcome to VQLForge Backend!"}

# For UVicorn ASGI server:
# Run with: uv uvicorn src.main:app --reload
