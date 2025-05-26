from typing import Optional
from pydantic import BaseModel
from src.schemas.translation import TranslationError  # If it's the same structure

# If ValidationError is truly distinct from TranslationError, define it separately


class ValidationError(BaseModel):
    explanation: str
    sql_suggestion: str


class VqlValidateRequest(BaseModel):
    sql: str  # Assuming this was meant to be vql or just generic sql to validate
    vql: str  # The VQL to validate


class VqlValidationApiResponse(BaseModel):
    validated: bool
    error_analysis: Optional[ValidationError] = None
    message: Optional[str] = None
