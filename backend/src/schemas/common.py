from typing import List, Dict, Any
from pydantic import BaseModel, Field


class HealthCheck(BaseModel):
    status: str = "OK"


class QueryResultRow(BaseModel):
    row: Dict[str, Any]


class QueryResponse(BaseModel):
    results: List[Dict[str, Any]]
    parsed_ast: str | None = None
    message: str | None = None


class VDBConfigFile(BaseModel):
    vdbs: List[str] = Field(default_factory=list)  # Changed from List[VDBConfigItem]


class VDBResponseItem(BaseModel):
    value: str
    label: str


class VDBResponse(BaseModel):
    results: List[VDBResponseItem]
