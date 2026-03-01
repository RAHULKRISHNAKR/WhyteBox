"""
Application Configuration

Centralized configuration management using Pydantic Settings.
Supports both PostgreSQL (production) and SQLite (local development).
"""

from pathlib import Path
from typing import List, Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve the .env file path relative to this config file, so uvicorn can be
# started from any working directory (e.g. whytebox-v2/ or whytebox-v2/backend/).
_ENV_FILE = Path(__file__).parent.parent.parent / ".env"
_ENV_FILE_STR = str(_ENV_FILE) if _ENV_FILE.exists() else ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database Configuration
    # Supports both PostgreSQL and SQLite
    # PostgreSQL: postgresql+asyncpg://user:pass@host:port/db
    # SQLite: sqlite+aiosqlite:///./database.db
    DATABASE_URL: str = "sqlite+aiosqlite:///./whytebox_local.db"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_CACHE_TTL: int = 3600
    REDIS_MODEL_CACHE_TTL: int = 7200
    REDIS_INFERENCE_CACHE_TTL: int = 1800
    REDIS_EXPLAINABILITY_CACHE_TTL: int = 3600

    # Security Configuration
    SECRET_KEY: str = "local-dev-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS Configuration
    # Stored as a raw string; parsed into a list via the validator below.
    # In .env, use comma-separated values (NOT a JSON array):
    #   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://whytebox-v22.vercel.app,https://*.vercel.app"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def ensure_async_db_driver(cls, v: object) -> str:
        """Rewrite sync PostgreSQL URLs to use the asyncpg driver.

        Render (and many PaaS providers) supply DATABASE_URL as:
          postgres://...   or   postgresql://...
        SQLAlchemy's asyncio extension requires:
          postgresql+asyncpg://...
        """
        if not isinstance(v, str):
            return v
        # Handle Render's shorthand "postgres://" scheme
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        # Handle plain "postgresql://" without a driver specifier
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> str:
        """Normalise ALLOWED_ORIGINS to a comma-separated string.

        Accepts:
          - str  → returned as-is (pydantic-settings passes env values as str)
          - list → joined with commas so the field stays a plain str
          - None / empty → returns the default value
        """
        if v is None or (isinstance(v, str) and not v.strip()):
            # Return default when env var is missing or empty
            return "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://whytebox-v22.vercel.app,https://*.vercel.app"
        if isinstance(v, list):
            return ",".join(str(o) for o in v)
        return str(v)

    @property
    def cors_origins(self) -> List[str]:
        """Return ALLOWED_ORIGINS as a list of stripped, non-empty strings."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 524288000  # 500MB in bytes
    UPLOAD_DIR: str = "./uploads"
    MODEL_CACHE_SIZE: int = 5

    # ML Settings
    PYTORCH_DEVICE: str = "cpu"  # Use "cuda" if GPU available
    TENSORFLOW_DEVICE: str = "/CPU:0"  # Use "/GPU:0" if GPU available
    MODEL_CACHE_TTL: int = 7200

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "text"  # "json" or "text"

    # Monitoring Configuration
    ENABLE_METRICS: bool = False
    METRICS_PORT: int = 9090

    # Celery Configuration (optional)
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    @property
    def upload_path(self) -> Path:
        """Get upload directory as Path object"""
        path = Path(self.UPLOAD_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def is_sqlite(self) -> bool:
        """Check if using SQLite database"""
        return "sqlite" in self.DATABASE_URL.lower()

    @property
    def is_postgresql(self) -> bool:
        """Check if using PostgreSQL database"""
        return "postgresql" in self.DATABASE_URL.lower()

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE_STR, env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )


# Create global settings instance
# Will load from .env file if it exists, otherwise use defaults
settings = Settings()

# Print configuration on import (for debugging)
if settings.DEBUG:
    print(f"🔧 Configuration loaded:")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Database: {'SQLite' if settings.is_sqlite else 'PostgreSQL'}")
    print(f"   Debug mode: {settings.DEBUG}")
    print(f"   ML Device: {settings.PYTORCH_DEVICE}")

# Made with Bob
