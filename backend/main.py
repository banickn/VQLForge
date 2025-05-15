import os
from typing import List, Dict, Any, Optional
import logging

from pydantic_ai import Agent, RunContext
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import sqlalchemy as db
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError, OperationalError

import sqlglot
from sqlglot import exp, parse_one
from sqlglot.errors import ParseError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
DENODO_HOST = os.getenv("DENODO_HOST")
DENODO_PORT = 9996
DENODO_DATABASE = os.getenv("DENODO_DB")
DENODO_USERNAME = os.getenv("DENODO_USER")
DENODO_PASSWORD = os.getenv("DENODO_PW")

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
    print("FATAL: Could not import Denodo driver. Make sure it's installed.")
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
    "http://localhost:4999",  # The origin of your frontend app
    "http://127.0.0.1:4999",  # Sometimes needed as well
    # Add other origins if deployed (e.g., "https://your-frontend-domain.com")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows specific origins
    allow_credentials=True,  # Allows cookies (if applicable)
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers (including Content-Type)
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


class VqlQueryResponse(BaseModel):
    vql: str


class QueryResultRow(BaseModel):
    # Using Dict[str, Any] for flexibility as column types can vary
    row: Dict[str, Any]


class QueryResponse(BaseModel):
    results: List[Dict[str, Any]]
    parsed_ast: str | None = None  # Optionally return the AST
    message: str | None = None


class TranslationError(BaseModel):
    explanation: str
    sql_suggestion: str


class ValidationError(BaseModel):
    explanation: str
    sql_suggestion: str


class VqlValidationApiResponse(BaseModel):
    validated: bool
    error_analysis: Optional[ValidationError] = (
        None  # Still expects ValidationError type
    )
    message: Optional[str] = None


class TranslateApiResponse(BaseModel):
    vql: str | None = None
    error_analysis: TranslationError | None = None
    message: str | None = None


class HealthCheck(BaseModel):
    """Response model to validate and return when performing a health check."""

    status: str = "OK"


# --- API Endpoint ---

def _initialize_agent(system_prompt: str, output_type: type) -> Agent:
    """Initializes a Pydantic AI Agent with the specified parameters."""
    google_api_key = os.getenv("GEMINI_API_KEY")
    if not google_api_key:
        logger.error("GEMINI_API_KEY environment variable not set.")
        # Raise an exception that the main endpoint can catch
        raise HTTPException(
            status_code=500, detail="AI service configuration error: API key missing."
        )
    # Assuming 'gemini-2.5-flash-preview-04-17' is the desired model for both
    return Agent(
        "gemini-2.5-flash-preview-04-17",
        system_prompt=system_prompt,
        output_type=output_type,
    )


def transform_vdb(node: exp.Expression, vdb_name: str) -> exp.Expression:
    """Recursively prefixes unqualified tables in a SQL expression with a VDB name.

    This acts as a sqlglot transformer function.

    Args:
        node: The current sqlglot Expression node being traversed.
        vdb_name: The VDB name to use as the database/catalog qualifier.

    Returns:
        The potentially modified Expression node.
    """
    if isinstance(node, exp.Table):
        is_qualified = bool(
            node.db or node.catalog or node.args.get("db") or node.args.get("catalog")
        )

        if not is_qualified and isinstance(node.this, exp.Identifier):
            logger.debug(f"Transforming table: {node.sql()} -> Adding db: {vdb_name}")
            new_node = node.copy()
            new_node.set(
                "db", exp.Identifier(this=vdb_name, quoted=False)
            )  # Assume VDB names aren't typically quoted
            return new_node

    return node


def analyze_validation_err(error: str, sql: str) -> ValidationError:
    """
    Analyzes VQL validation errors using an AI agent.
    Provides an explanation for the error and suggests a corrected VQL query based on the input error and SQL.
    Uses tools to fetch available views/functions if needed.

    Args:
        error: The error message string returned by the VQL validation process.
        sql: The original VQL query string that failed validation.

    Returns:
        A ValidationError object containing the AI-generated explanation and
        suggested corrected SQL.

    Raises:
        HTTPException:
            - 500: If the GEMINI_API_KEY environment variable is not set.
            - 503: If the AI agent returns an invalid or unexpected response.
            - 503: If there's an error communicating with the AI service.
    """
    agent = _initialize_agent(
        "You are an SQL Validation assistant", ValidationError
    )

    @agent.tool
    def get_views(ctx: RunContext[str]) -> list[str]:
        # This is a placeholder. Later, this would query Denodo metadata.
        # For now, returning static list.
        return ["this", "is", "a", "placeholder", "test3"]

    @agent.tool
    def get_denodo_functions(ctx: RunContext[str]) -> list[str]:
        if engine is None:
            raise HTTPException(
                status_code=503,  # Service Unavailable
                detail="Database connection is not available. Check server logs.",
            )
        vql = f"list functions"
        try:
            with engine.connect() as connection:
                query = text(vql)
                result = connection.execute(query)
                functions: list[str] = [row[2] for row in result]

            logger.info(f"Successfully retrieved VDB names: {functions}")
            return functions
        except Exception as e:
            # Log the actual exception for debugging
            logger.error(f"Error executing VQL query '{vql}' to get functions: {e}", exc_info=True)
            # Raise an HTTP exception that is more user-friendly for the API client
            raise HTTPException(
                status_code=500,  # Internal Server Error for query execution failures
                detail=f"Failed to retrieve functions from Denodo: {str(e)}",
            )

    @agent.tool
    def get_vdbs(ctx: RunContext[str]) -> list[str]:
        if engine is None:
            raise HTTPException(
                status_code=503,  # Service Unavailable
                detail="Database connection is not available. Check server logs.",
            )
        vql = f"select db_name from get_databases()"
        try:
            with engine.connect() as connection:
                query = text(vql)
                result = connection.execute(query)
                db_names: list[str] = [row.db_name for row in result]

            logger.info(f"Successfully retrieved VDB names: {db_names}")
            return db_names
        except Exception as e:
            # Log the actual exception for debugging
            logger.error(f"Error executing VQL query '{vql}' to get VDBs: {e}", exc_info=True)
            # Raise an HTTP exception that is more user-friendly for the API client
            raise HTTPException(
                status_code=500,  # Internal Server Error for query execution failures
                detail=f"Failed to retrieve VDB list from the database: {str(e)}",
            )

    prompt: str = f"""Analyze the VQL Validation error. Explain concisely why the `Input VQL` failed based on the `Error` and provide the corrected `Valid SQL`.
                Do not use ```sql markdown for the corrected SQL response. Do not explain what you are doing, just provide the explanation and the suggestion directly.
                If the table is missing, use the get_views to determine which tables are available and use the best guess in your suggestion.
                If a function is not valid, use get_denodo_functions to check for available denodo functions.
                If a database name is invalid, use get_vdbs to check for database names. Suggest one that is similar to the input or tell the user to double check the input.
                                **ERROR:**
                                {error}
                                **Input SQL:**
                                ```sql
                                {sql}```"""
    try:
        response = agent.run_sync(prompt)
        if response and response.output:
            logger.info(f"AI Analysis Explanation: {response.output.explanation}")
            logger.info(f"AI Analysis Suggestion: {response.output.sql_suggestion}")
            return response.output
        else:
            logger.error(f"AI agent returned unexpected response: {response}")
            raise HTTPException(
                status_code=503, detail="AI service returned an invalid response."
            )

    except Exception as agent_error:
        logger.error(f"Error calling AI Agent: {agent_error}", exc_info=True)
        # Raise an HTTPException to be caught by FastAPI and return a 5xx error
        raise HTTPException(
            status_code=503, detail=f"AI service unavailable or failed: {agent_error}"
        )


def analyze_translation_err(exception: str, sql: str) -> TranslationError:
    """Analyzes an SQL translation error using an AI agent to provide an explanation and suggestion.

    Args:
        exception: The error message string from the SQL execution attempt.
        sql: The original SQL query string that caused the error.

    Returns:
        A TranslationError object containing the AI's explanation and suggested SQL correction.

    Raises:
        HTTPException: If the AI API key is not configured, the AI service returns
                       an invalid response, or the AI service call fails.
    """
    agent = _initialize_agent(
        "You are an SQL Translation assistant", TranslationError
    )

    prompt = f"""Analyze the SQL error below. Explain concisely why the `Input SQL` failed based on the `Error` and provide the corrected `Valid SQL`.
                Do not use ```sql markdown for the corrected SQL response. Do not explain what you are doing, just provide the explanation and the suggestion directly.
                                **ERROR:**
                                {exception}
                                **Input SQL:**
                                ```sql
                                {sql}```"""

    try:
        response = agent.run_sync(prompt)
        if response and response.output:
            logger.info(f"AI Analysis Explanation: {response.output.explanation}")
            logger.info(f"AI Analysis Suggestion: {response.output.sql_suggestion}")
            return response.output
        else:
            logger.error(f"AI agent returned unexpected response: {response}")
            raise HTTPException(
                status_code=503, detail="AI service returned an invalid response."
            )

    except Exception as agent_error:
        logger.error(f"Error calling AI Agent: {agent_error}", exc_info=True)
        # Raise an HTTPException to be caught by FastAPI and return a 5xx error
        raise HTTPException(
            status_code=503, detail=f"AI service unavailable or failed: {agent_error}"
        )


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
def validate_vql_query(request: VqlValidateRequest) -> VqlValidationApiResponse:
    """
    Validates VQL syntax against Denodo using DESC QUERYPLAN.
    Provides AI analysis if validation fails with a known error type.
    """
    if engine is None:
        raise HTTPException(
            status_code=503,  # Service Unavailable
            detail="Database connection is not available. Check server logs.",
        )

    vql: str = request.vql
    vql = f"DESC QUERYPLAN {vql}"

    try:
        with engine.connect() as connection:
            query = text(request.vql)
            # We don't actually need the results, just whether it throws an error
            connection.execute(query)
            logger.info("VQL validation successful via DESC QUERYPLAN.")
            return VqlValidationApiResponse(
                validated=True,
                error_analysis=None,
                message="VQL syntax check successful!",
            )

    except (OperationalError, ProgrammingError) as e:
        db_error_message = str(getattr(e, "orig", e))  # Get specific DB error
        logger.warning(f"Denodo VQL validation failed: {db_error_message}")
        try:
            ai_analysis_result: ValidationError = analyze_validation_err(
                db_error_message, request.vql
            )
            return VqlValidationApiResponse(
                validated=False, error_analysis=ai_analysis_result, message=None
            )
        except HTTPException as http_exc:
            logger.error(
                f"AI analysis failed during validation error handling: {http_exc.detail}"
            )
            return VqlValidationApiResponse(
                validated=False,
                error_analysis=None,
                message=f"Validation Failed: {db_error_message}. Additionally, AI analysis failed: {http_exc.detail}",
            )
        except Exception as ai_err:  # Catch unexpected errors during AI call
            logger.error(
                f"Unexpected error during AI validation analysis: {ai_err}",
                exc_info=True,
            )
            return VqlValidationApiResponse(
                validated=False,
                error_analysis=None,
                message=f"Validation Failed: {db_error_message}. Additionally, an unexpected error occurred during AI analysis.",
            )

    except SQLAlchemyError as e:
        logger.error(
            f"Database connection or general SQLAlchemy error during validation: {e}",
            exc_info=True,
        )
        # Return validation failed with a generic DB error message
        return VqlValidationApiResponse(
            validated=False,
            error_analysis=None,
            message=f"Database error during validation: {str(e)}",
        )

    except Exception as e:
        logger.error(f"Unexpected error during VQL validation: {e}", exc_info=True)
        # Return validation failed with a generic unexpected error message
        return VqlValidationApiResponse(
            validated=False,
            error_analysis=None,
            message=f"An unexpected error occurred during validation: {str(e)}",
        )


@app.post("/translate")
def translate_sql(request: SqlQueryRequest) -> TranslateApiResponse:
    source_sql = request.sql
    dialect: str = request.dialect
    vdb: str = request.vdb
    if not source_sql:
        raise HTTPException(status_code=400, detail="Missing 'sql' in request body")
    if not dialect:
        raise HTTPException(status_code=400, detail="Missing 'dialect' in request body")
    print(f"Using sqlglot version: {sqlglot.__version__}")
    logger.debug(f"Received translation request: dialect='{dialect}', vdb='{vdb}'")
    logger.debug(f"Source SQL: {source_sql}")

    try:
        # Example: Simple uppercase conversion
        converted_vql = f"-- VQL Conversion of:\n{source_sql.upper()}"
        expression_tree = parse_one(source_sql, dialect=dialect)
        if vdb:
            expression_tree = expression_tree.transform(transform_vdb, vdb)
        converted_vql = expression_tree.sql(dialect="denodo", pretty=True)

        print(f"Received SQL: {source_sql}")
        print(f"Returning VQL: {converted_vql}")
        print(f"{dialect}")
        return TranslateApiResponse(vql=converted_vql)
    except ParseError as pe:
        print(f"SQL Parsing Error during translation: {pe}")
        try:
            # analyze_translation_err still returns a TranslationError instance
            ai_analysis_result: TranslationError = analyze_translation_err(
                str(pe), source_sql
            )
            # Return the error analysis case within the new model
            return TranslateApiResponse(error_analysis=ai_analysis_result)
        except (
            HTTPException
        ) as http_exc:  # If AI service itself fails (e.g., key error)
            # Let FastAPI handle this HTTP Exception directly
            raise http_exc
        except Exception as ai_err:  # Catch unexpected errors during the AI call
            print(f"Error during AI analysis: {ai_err}")
            # Return a generic error message using the new model's message field
            # Alternatively, raise HTTPException(status_code=500, detail=f"AI Analysis Error: {str(ai_err)}")
            return TranslateApiResponse(
                message=f"An error occurred during AI analysis: {str(ai_err)}"
            )

    except Exception as e:  # Catch other general exceptions during translation
        print(f"General Error during translation: {e}")
        # Return a generic error message using the new model's message field
        # Alternatively, raise HTTPException(status_code=500, detail=f"Translation Error: {str(e)}")
        return TranslateApiResponse(message=f"Translation failed: {str(e)}")


@app.get("/")
def read_root():
    return {"message": "Hello!"}
