import os
import sqlglot
import sqlalchemy as db
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError, OperationalError
from sqlglot import exp, parse_one
from sqlglot.errors import ParseError
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
DENODO_HOST = "denodo-vdp"
DENODO_PORT = 9996
DENODO_DATABASE = "admin"
DENODO_USERNAME = "admin"
DENODO_PASSWORD = "admin"

# --- SQLAlchemy Engine Setup ---
DATABASE_URL = f"denodo://{DENODO_USERNAME}:{DENODO_PASSWORD}@{DENODO_HOST}:{DENODO_PORT}/{DENODO_DATABASE}"

try:
    engine = db.create_engine(DATABASE_URL)
    with engine.connect() as connection:
        print("Successfully connected to Denodo.")
except SQLAlchemyError as e:
    print(f"FATAL: Could not connect to Denodo database: {e}")
    exit(1)
    engine = None  # Set engine to None if connection fails
except ImportError as e:
    print(f"FATAL: Could not import Denodo driver. Make sure it's installed.")
    print(f"ImportError: {e}")
    exit(1)
    engine = None


# --- FastAPI Application ---
app = FastAPI(
    title="VQLForge Backend",
    description="The backend to transpile and validate SQL to VQL",
    version="1.0.0",
)
# --- CORS Configuration ---
origins = [
    "http://localhost:80",  # The origin of your frontend app
    "http://127.0.0.1:80",  # Sometimes needed as well
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
    vdb: str


class VqlValidateRequest(BaseModel):
    sql: str
    vql: str


class VqlValidateResponse(BaseModel):
    validated: bool
    error: str


class VqlQueryResponse(BaseModel):
    vql: str


class QueryResultRow(BaseModel):
    # Using Dict[str, Any] for flexibility as column types can vary
    row: Dict[str, Any]


class QueryResponse(BaseModel):
    results: List[Dict[str, Any]]
    parsed_ast: str | None = None  # Optionally return the AST
    message: str | None = None


class HealthCheck(BaseModel):
    """Response model to validate and return when performing a health check."""

    status: str = "OK"
# --- API Endpoint ---


def transform_vdb(node: exp.Expression, vdb_name: str) -> exp.Expression:
    """
    sqlglot transformer to add a VDB name as the database/catalog
    to unqualified table identifiers.
    """
    if isinstance(node, exp.Table):
        # Check if the table is *not* already qualified with a database/catalog
        # node.db gets the database name string, node.catalog gets the catalog name string
        # Some dialects use 'db', some use 'catalog'. Check both for robustness.
        # We only want to add the vdb if the table is simple (e.g., "table1", not "schema.table1" or "db.schema.table1")
        is_qualified = bool(node.db or node.catalog or node.args.get('db') or node.args.get('catalog'))

        # A simple heuristic: only add VDB if it's not qualified at all.
        # More complex logic might be needed depending on desired behavior for partially qualified names.
        if not is_qualified and isinstance(node.this, exp.Identifier):
            # Use node.set() to modify the 'db' argument of the Table node
            # This correctly handles quoting and structure.
            # We create a new Identifier for the vdb name.
            logger.debug(f"Transforming table: {node.sql()} -> Adding db: {vdb_name}")
            new_node = node.copy()  # Work on a copy to be safe
            new_node.set('db', exp.Identifier(this=vdb_name, quoted=False))  # Assume VDB names aren't typically quoted
            return new_node

    return node  # Return the original or modified node


@app.get(
    "/health",
    tags=["healthcheck"],
    summary="Perform a Health Check",
    response_description="Return HTTP Status Code 200 (OK)",
    status_code=status.HTTP_200_OK,
    response_model=HealthCheck,
)
def get_health() -> HealthCheck:
    """
    ## Perform a Health Check
    Endpoint to perform a healthcheck on. This endpoint can primarily be used Docker
    to ensure a robust container orchestration and management is in place. Other
    services which rely on proper functioning of the API service will not deploy if this
    endpoint returns any other HTTP status code except 200 (OK).
    Returns:
        HealthCheck: Returns a JSON response with the health status
    """
    return HealthCheck(status="OK")


@app.post("/validate")
def validate_vql_query(request: VqlValidateRequest) -> VqlValidateResponse:
    """
    Executes a given SQL query against the configured Denodo database.
    """
    logger.info(f"--- /validate endpoint correctly reached via POST ---")  # Add a log here
    if engine is None:
        raise HTTPException(
            status_code=503,  # Service Unavailable
            detail="Database connection is not available. Check server logs."
        )

    vql: str = request.vql
    vql = f"DESC QUERYPLAN {vql}"
    validate_result = False
    try:
        with engine.connect() as connection:
            query = text(vql)  # Use the original SQL string
            result_proxy = connection.execute(query)
            validate_result = True
            error = ""
    except (OperationalError, ProgrammingError) as e:
        error = str(getattr(e, 'orig', e))  # Try to get the original DBAPI error message
        validate_result = False
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

    return VqlValidateResponse(validated=validate_result, error=error)


@app.post("/translate")
async def translate_sql(request: SqlQueryRequest):
    source_sql = request.sql
    dialect: str = request.dialect
    vdb: str = request.vdb
    if not source_sql:
        raise HTTPException(status_code=400, detail="Missing 'sql' in request body")
    if not dialect:
        raise HTTPException(status_code=400, detail="Missing 'dialect' in request body")

    logger.debug(f"Received translation request: dialect='{dialect}', vdb='{vdb}'")
    logger.debug(f"Source SQL: {source_sql}")

    try:
        # Example: Simple uppercase conversion
        converted_vql = f"-- VQL Conversion of:\n{source_sql.upper()}"
        expression_tree = parse_one(source_sql, dialect=dialect)
        if vdb:
            expression_tree = expression_tree.transform(transform_vdb, vdb)
        converted_vql = expression_tree.sql(dialect="denodo", pretty=True)
        # parse_one(sql, dialect="spark").sql(dialect="duckdb")

        # converted_vql = (sqlglot.transpile(source_sql, write="denodo", identify=True, pretty=True)[0])
        # converted_vql = sqlglot.transpile(source_sql, read=dialect, write="denodo", pretty=True)[0]
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
    return {"message": "Hello!"}
