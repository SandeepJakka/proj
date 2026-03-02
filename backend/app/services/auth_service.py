from datetime import datetime, timedelta
from typing import Optional
import random
import string
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

# ── JWT Configuration ───────────────────────────────────────────────────────
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES   # 1440 min = 1 day
REFRESH_TOKEN_EXPIRE_DAYS   = settings.REFRESH_TOKEN_EXPIRE_DAYS      # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Password helpers (EXISTING — DO NOT REMOVE) ──────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Return bcrypt hash of the given password."""
    return pwd_context.hash(password)

# ── Access token (EXISTING — DO NOT REMOVE) ──────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a short-lived JWT access token (default 1 day)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate an access token. Returns payload dict or None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# ── Refresh token (NEW) ───────────────────────────────────────────────────────

def create_refresh_token(data: dict) -> str:
    """
    Create a long-lived JWT refresh token (default 7 days).
    Uses a distinct secret derived from SECRET_KEY so access & refresh tokens
    are not interchangeable.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    # Use a slightly different secret to prevent token type confusion
    refresh_secret = settings.SECRET_KEY + "_refresh"
    return jwt.encode(to_encode, refresh_secret, algorithm=ALGORITHM)

def decode_refresh_token(token: str) -> Optional[dict]:
    """
    Decode and validate a refresh token.
    Returns payload dict on success, None on failure.
    """
    try:
        refresh_secret = settings.SECRET_KEY + "_refresh"
        payload = jwt.decode(token, refresh_secret, algorithms=[ALGORITHM])
        # Ensure this is actually a refresh token
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None

# ── OTP helpers (NEW) ─────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Generate a cryptographically random 6-digit OTP string."""
    return "".join(random.choices(string.digits, k=6))

def verify_otp(user, otp_code: str) -> bool:
    """
    Verify that the provided OTP matches the user's stored OTP and has not expired.

    Args:
        user:     SQLAlchemy User model instance (must have otp_code, otp_expires_at).
        otp_code: The OTP string submitted by the user.

    Returns:
        True if valid and not expired, False otherwise.
    """
    if not user.otp_code or not user.otp_expires_at:
        return False
    if user.otp_code != otp_code:
        return False
    if datetime.utcnow() > user.otp_expires_at:
        return False  # OTP has expired
    return True

