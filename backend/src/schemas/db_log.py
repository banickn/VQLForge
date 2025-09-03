from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base
import datetime
from typing import List

# SQLAlchemy ORM Model
Base = declarative_base()


class AcceptedQuery(Base):
    __tablename__ = "accepted_queries"

    id: Column[int] = Column(Integer, primary_key=True, index=True)
    timestamp: Column[datetime.datetime] = Column(DateTime, default=datetime.datetime.utcnow)
    source_dialect: Column[str] = Column(String, index=True)
    source_sql: Column[str] = Column(Text)
    target_vql: Column[str] = Column(Text)
    tables: Column[str] = Column(Text)

# Pydantic Model for API request


class AcceptedQueryLogRequest(BaseModel):
    source_sql: str = Field(..., example="SELECT * FROM my_table")
    source_dialect: str = Field(..., example="oracle")
    target_vql: str = Field(..., example="SELECT * FROM my_table")

# Pydantic model for a single log entry in an API response


class AcceptedQueryLogResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    source_dialect: str
    source_sql: str
    target_vql: str
    tables: str  # The 'tables' field is a JSON string
    model_config = ConfigDict(from_attributes=True)


# Pydantic model for a list of log entries
class AcceptedQueryLogListResponse(BaseModel):
    results: List[AcceptedQueryLogResponse]
