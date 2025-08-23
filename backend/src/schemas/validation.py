from typing import Optional
from pydantic import BaseModel
from src.schemas.translation import AIAnalysis  # Use the unified error model


class VqlValidateRequest(BaseModel):
    sql: str  # The original SQL, for context if needed
    vql: str  # The VQL to validate


class VqlValidationApiResponse(BaseModel):
    validated: bool
    error_analysis: Optional[AIAnalysis] = None  # Changed from TranslationError to AIAnalysis
    message: Optional[str] = None
