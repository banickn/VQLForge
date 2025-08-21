import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()  # Loads variables from .env file


class Settings(BaseSettings):
    DENODO_HOST: str
    DENODO_PORT: int = 9996
    DENODO_DB: str
    DENODO_USER: str
    DENODO_PW: str
    GEMINI_API_KEY: str
    AI_MODEL_NAME: str

    DATABASE_URL: str | None = None  # Will be constructed
    APP_VDB_CONF: str
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def __init__(self, **values):
        super().__init__(**values)
        if not self.DATABASE_URL:  # Construct if not manually set
            self.DATABASE_URL = f"denodo://{self.DENODO_USER}:{self.DENODO_PW}@{self.DENODO_HOST}:{self.DENODO_PORT}/{self.DENODO_DB}"


settings = Settings()
