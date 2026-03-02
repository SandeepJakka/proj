import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # ── App metadata ──────────────────────────────────────────────────────
    APP_NAME: str = os.getenv("APP_NAME", "Healthora")
    ENV: str      = os.getenv("ENV", "development")

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # ── JWT / Auth ────────────────────────────────────────────────────────
    SECRET_KEY: str                 = os.getenv("SECRET_KEY", "change-me-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))   # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int   = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))         # 7 days

    # ── Email (Gmail SMTP) ────────────────────────────────────────────────
    GMAIL_SENDER_EMAIL: str  = os.getenv("GMAIL_SENDER_EMAIL", "")
    GMAIL_APP_PASSWORD: str  = os.getenv("GMAIL_APP_PASSWORD", "")

    # ── AI / LLM API keys ─────────────────────────────────────────────────
    GROQ_API_KEY:   str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL:   str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GROQ_MODEL:     str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_VISION_MODEL: str = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
    GROQ_MULTILINGUAL_MODEL: str = os.getenv("GROQ_MULTILINGUAL_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
    HF_API_TOKEN:   str = os.getenv("HF_API_TOKEN", "")
    HF_MODEL_ID:    str = os.getenv("HF_MODEL_ID", "ruslanmv/Medical-Llama3-8B")

    # ── CORS ──────────────────────────────────────────────────────────────
    # Comma-separated origins in .env, parsed into a list here
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",")

    # ── File Uploads ──────────────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))

    # ── AWS S3 ────────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "healthora-reports")

settings = Settings()

