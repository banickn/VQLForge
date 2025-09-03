from typing import List, Optional
from pydantic import BaseModel, Field
from src.schemas.translation import AIAnalysis


class AgenticModeRequest(BaseModel):
    sql: str = Field(..., example="SELECT count(*) AS total FROM some_view")
    dialect: str
    vdb: str
    vql: str


class AgentStep(BaseModel):
    step_name: str
    details: str
    success: bool
    output: Optional[str] = None


class AgenticModeResponse(BaseModel):
    final_vql: Optional[str] = None
    is_valid: bool
    process_log: List[AgentStep]
    final_message: str
    error_analysis: Optional[AIAnalysis] = None
