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
    # Potentially exit if DB is critical for app startup
    # For now, we let endpoints handle `get_engine()` failure if init_db_engine() fails here.
    # If init_db_engine() itself raises an unhandled exception or exits, app won't start.
    if init_db_engine() is None:
        logger.fatal("Application startup failed: Could not connect to the database.")
        # Depending on your deployment, you might exit(1) or let it run and fail on requests
        # For Kubernetes/Docker, failing to start might be better for restart policies.
        # exit(1) # Uncomment if DB is absolutely critical for app to even start

app = FastAPI(
    title="VQLForge Backend",
    description="The backend to transpile and validate SQL to VQL",
    version="1.0.0",
    # Potentially add lifespan events for DB connection pool management if needed
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
