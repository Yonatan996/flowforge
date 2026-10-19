import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FlowForge"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "flowforge_development_secret_key_needs_override_in_production_32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./flowforge.db"

    # Redis & Queue
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_REDIS_QUEUE: bool = False

    # Worker
    WORKER_CONCURRENCY: int = 5
    EXECUTION_TIMEOUT_SECONDS: int = 60
    MAX_STEP_RETRIES: int = 3
    RETRY_BASE_DELAY_SECONDS: float = 1.0
    RETRY_MAX_DELAY_SECONDS: float = 30.0

    # Scheduler
    SCHEDULER_CHECK_INTERVAL_SECONDS: int = 10

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Limits
    MAX_WORKFLOW_STEPS: int = 50

    # SSRF Protection
    ALLOWED_HTTP_SCHEMES: List[str] = ["http", "https"]
    HTTP_TIMEOUT_SECONDS: float = 10.0
    MAX_RESPONSE_SIZE_BYTES: int = 512 * 1024  # 512 KB
    ALLOW_REDIRECTS: bool = False  # Disable redirects to prevent DNS rebinding/redirect evasion

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        env = os.environ.get("ENVIRONMENT", "development").lower()
        if env == "production":
            if not v or "needs_override" in v or v == "flowforge_development_secret_key_needs_override_in_production_32chars":
                raise ValueError("In production, SECRET_KEY must be securely configured and not use default placeholder")
            if len(v) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters long in production")
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
