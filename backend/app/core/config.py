import os
from typing import List
from dotenv import load_dotenv

# Load .env file if it exists (local development)
load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "AIGPMS")
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # ─── Security ────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "180")
    )

    # ─── Database ────────────────────────────────────────────────────────────
    # Default to SQLite for local development; set DATABASE_URL in .env for PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./aigpms.db")

    # ─── CORS ────────────────────────────────────────────────────────────────
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # ─── File Uploads ─────────────────────────────────────────────────────────
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))

    # ─── PDC Alert Configuration ──────────────────────────────────────────────
    # Days before cheque date to send alerts (configurable via .env or system_settings table)
    PDC_ALERT_DAYS: List[int] = [
        int(d) for d in os.getenv("PDC_ALERT_DAYS", "30,14,7,3").split(",")
    ]

settings = Settings()
