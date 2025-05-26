from typing import List, Dict, Any
from pydantic import BaseModel


class HealthCheck(BaseModel):
    status: str = "OK"


class QueryResultRow(BaseModel):
    row: Dict[str, Any]


class QueryResponse(BaseModel):
    results: List[Dict[str, Any]]
    parsed_ast: str | None = None
    message: str | None = None


class VDBResponse(BaseModel):
    results: List[Dict[str, str]]
