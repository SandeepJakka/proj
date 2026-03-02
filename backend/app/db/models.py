from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.database import Base
from app.db.models_chat import ChatMessage
from app.db.models_reports import Report, ReportExtract
from app.db.models_profile import HealthProfile


class User(Base):
    __tablename__ = "users"

    # ── Core identity ───────────────────────────────────────────────────
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    full_name       = Column(String, nullable=True)           # Optional display name
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    # ── Account status ──────────────────────────────────────────────────
    is_verified = Column(Boolean, default=False)   # True after OTP email verification
    is_active   = Column(Boolean, default=True)    # Can be set False to soft-ban user

    # ── OTP email verification ──────────────────────────────────────────
    otp_code       = Column(String, nullable=True)            # 6-digit OTP code
    otp_expires_at = Column(DateTime, nullable=True)          # OTP expiry timestamp

    # ── JWT refresh token ───────────────────────────────────────────────
    refresh_token  = Column(String, nullable=True)            # Hashed refresh token stored in DB

    # ── Profile sharing ─────────────────────────────────────────────────
    username = Column(String, unique=True, nullable=True, index=True)
    profile_public = Column(Boolean, default=False)
    public_fields = Column(String, nullable=True)  # JSON array of visible fields
