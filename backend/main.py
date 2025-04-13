import os
import sqlglot
import sqlalchemy as db
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError  # More specific error types
from sqlglot import parse_one
from sqlglot.errors import ParseError

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field  # Use Field for examples in Swagger UI
from typing import List, Dict, Any

# --- Configuration (Best Practice: Use Environment Variables or Settings Mgmt) ---
# Example using environment variables (recommended)
# DENODO_HOST = os.getenv("DENODO_HOST", "denodocommunity-lab-environment-vdp")
# DENODO_PORT = int(os.getenv("DENODO_PORT", 9994))
# DENODO_DATABASE = os.getenv("DENODO_DATABASE", "admin")
# DENODO_USERNAME = os.getenv("DENODO_USERNAME", "admin")
# DENODO_PASSWORD = os.getenv("DENODO_PASSWORD", "admin")
# DENODO_USE_ENCRYPTION = os.getenv("DENODO_USE_ENCRYPTION", "false").lower() == "true"

# Using constants for simplicity in this example (NOT recommended for production)
DENODO_HOST = "denodocommunity-lab-environment-vdp"  # Replace if different
DENODO_PORT = 9994
DENODO_DATABASE = "admin"
DENODO_USERNAME = "admin"
DENODO_PASSWORD = "admin"  # Keep passwords secure!
DENODO_USE_ENCRYPTION = False  # Connect args expect boolean or string 'true'/'false'

# --- SQLAlchemy Engine Setup ---
DATABASE_URL = f"denodo+flightsql://{DENODO_USERNAME}:{DENODO_PASSWORD}@{DENODO_HOST}:{DENODO_PORT}/{DENODO_DATABASE}"

# Note: connect_args might vary slightly based on the exact driver version/implementation
# Check the denodo-sqlalchemy-flightsql driver documentation if needed.
connect_args = {"use_encryption": str(DENODO_USE_ENCRYPTION).lower()}

try:
    engine = db.create_engine(DATABASE_URL, connect_args=connect_args)
    # Try a simple connection test on startup (optional but good)
    with engine.connect() as connection:
        print("Successfully connected to Denodo.")
except SQLAlchemyError as e:
    print(f"FATAL: Could not connect to Denodo database: {e}")
    # You might want to exit the application here if the DB is essential
    # exit(1)
    engine = None  # Set engine to None if connection fails
except ImportError as e:
    print(f"FATAL: Could not import Denodo FlightSQL driver. Make sure it's installed.")
    print(f"ImportError: {e}")
    # exit(1)
    engine = None


# --- FastAPI Application ---
app = FastAPI(
    title="Denodo SQL Executor API",
    description="An API to execute SQL queries against a Denodo database.",
    version="1.0.0",
)
# --- CORS Configuration ---
origins = [
    "http://localhost:3000",  # The origin of your frontend app
    "http://127.0.0.1:3000",  # Sometimes needed as well
    # Add other origins if deployed (e.g., "https://your-frontend-domain.com")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Allows specific origins
    allow_credentials=True,      # Allows cookies (if applicable)
    allow_methods=["*"],         # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],         # Allows all headers (including Content-Type)
)
# --- End CORS Configuration ---
# --- Pydantic Models ---


class SqlQueryRequest(BaseModel):
    sql: str = Field(..., example="SELECT count(*) AS total FROM some_view")
    dialect: str


class VqlQueryResponse(BaseModel):
    vql: str


class QueryResultRow(BaseModel):
    # Using Dict[str, Any] for flexibility as column types can vary
    row: Dict[str, Any]


class QueryResponse(BaseModel):
    results: List[Dict[str, Any]]
    parsed_ast: str | None = None  # Optionally return the AST
    message: str | None = None

# --- API Endpoint ---


@app.post("/execute", response_model=QueryResponse)
def execute_sql_query(request: SqlQueryRequest):
    """
    Executes a given SQL query against the configured Denodo database.

    **⚠️ WARNING:** Executing arbitrary SQL is a security risk.
    Ensure proper validation, sanitization, and permissions are in place.
    """
    if engine is None:
        raise HTTPException(
            status_code=503,  # Service Unavailable
            detail="Database connection is not available. Check server logs."
        )

    sql = request.sql
    parsed_ast_repr = None

    # 1. Parse the SQL using sqlglot (optional but good for validation)
    try:
        parsed_ast = parse_one(sql)  # Use dialect='denodo' if needed and supported
        parsed_ast_repr = repr(parsed_ast)
        print(f"Parsed AST: {parsed_ast_repr}")  # Log the AST
    except ParseError as e:
        raise HTTPException(
            status_code=400,  # Bad Request
            detail=f"Invalid SQL syntax: {str(e)}"
        )
    except Exception as e:  # Catch other potential sqlglot errors
        raise HTTPException(
            status_code=400,  # Bad Request
            detail=f"Error parsing SQL: {str(e)}"
        )

    # 2. Execute the query against Denodo
    results_list = []
    try:
        with engine.connect() as connection:
            query = text(sql)  # Use the original SQL string
            result_proxy = connection.execute(query)

            if result_proxy.returns_rows:
                keys = result_proxy.keys()
                for row in result_proxy:
                    results_list.append(dict(zip(keys, row)))
                message = f"Query executed successfully. Found {len(results_list)} rows."
            else:
                message = f"Query executed successfully. No rows returned (e.g., INSERT, UPDATE, DELETE)."
                # For DML/DDL, rowcount might be useful if the driver supports it well
                # message += f" Rows affected: {result_proxy.rowcount}"

    except ProgrammingError as e:  # Often indicates issues with SQL syntax/permissions for the DB
        print(f"Database Programming Error: {e}")
        raise HTTPException(
            status_code=400,  # Bad Request might be suitable if SQL is invalid for Denodo
            detail=f"Database programming error: {str(e)}"
        )
    except SQLAlchemyError as e:  # Catch other SQLAlchemy/DBAPI errors
        print(f"Database Execution Error: {e}")
        raise HTTPException(
            status_code=500,  # Internal Server Error
            detail=f"Database error during query execution: {str(e)}"
        )
    except Exception as e:  # Catch unexpected errors
        print(f"Unexpected Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

    return QueryResponse(results=results_list, parsed_ast=parsed_ast_repr, message=message)

# --- Root endpoint for basic check ---


@app.post("/translate")
async def translate_sql(request: SqlQueryRequest):
    source_sql = request.sql
    dialect: str = request.dialect
    if not source_sql:
        raise HTTPException(status_code=400, detail="Missing 'sql' in request body")

    try:
        # Example: Simple uppercase conversion
        converted_vql = f"-- VQL Conversion of:\n{source_sql.upper()}"
        # converted_vql = (sqlglot.transpile(source_sql, write="denodo", identify=True, pretty=True)[0])
        converted_vql = sqlglot.transpile(source_sql, read=dialect, write="denodo", pretty=True)[0]
        print(f"Received SQL: {source_sql}")
        print(f"Returning VQL: {converted_vql}")
        print(f"{dialect}")
        return {"vql": converted_vql}
    except Exception as e:
        print(f"Error during translation: {e}")
        # Return a structured error
        raise HTTPException(status_code=500, detail=f"Translation Error: {str(e)}")
    # --- !!! ---


@app.get("/")
def read_root():
    return {"message": "Welcome to the Denodo SQL Executor API"}

# --- How to run (using uvicorn) ---
# Save this file as main.py
# Run in terminal: uvicorn main:app --reload --host 0.0.0.0 --port 8000
#
# You will also need to install dependencies:
# pip install fastapi uvicorn sqlalchemy sqlglot "denodo-sqlalchemy-flightsql" # Use the actual package name for the denodo driver
