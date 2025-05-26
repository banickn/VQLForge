from typing import Optional
from pydantic import BaseModel, Field


class SqlQueryRequest(BaseModel):
    sql: str = Field(..., example="SELECT count(*) AS total FROM some_view")
    dialect: str
    vdb: str


class VqlQueryResponse(BaseModel):  # If still used directly anywhere
    vql: str


class TranslationError(BaseModel):
    explanation: str
    sql_suggestion: str


class TranslateApiResponse(BaseModel):
    vql: str | None = None
    error_analysis: Optional[TranslationError] = None
    message: str | None = None
