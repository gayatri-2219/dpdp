"""
DPDP Shield — Configuration Settings
Reads from .env file via pydantic-settings
"""
import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # App
    APP_NAME: str = "DPDP Shield"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dpdp-shield-dev-secret-key-change-in-production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dpdp:dpdp_secret@localhost:5432/dpdp_compliance"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI / LLM
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    EMBEDDING_MODEL: str = "models/text-embedding-004"

    # Storage
    UPLOAD_DIR: str = "uploads"
    REPORTS_DIR: str = "reports"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: str = "pdf,docx,csv,xlsx,txt,png,jpg,jpeg"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def allowed_extensions_list(self) -> list[str]:
        return [e.strip().lower() for e in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
