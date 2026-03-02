"""
auth.py
───────
Authentication endpoints for Healthora.

Endpoints:
  POST /api/auth/register       — Register + send OTP (no token yet)
  POST /api/auth/verify-email   — Verify OTP → issue access + refresh tokens
  POST /api/auth/resend-otp     — Resend OTP email
  POST /api/auth/login          — Login (must be verified) → issue tokens
  POST /api/auth/refresh        — Exchange refresh token for new access token
  POST /api/auth/logout         — Clear refresh token (requires auth)
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.config import settings
from app.db import models
from app.db.deps import get_db, get_current_user
from app.services import auth_service
from app.services.email_service import send_otp_email, send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Rate limiter instance (shared with main.py via state, also declared here for decorators)
limiter = Limiter(key_func=get_remote_address)

# ── OAuth2 scheme (kept for backward compat with deps.py) ────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# ── Request / Response schemas ────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class ResendOTP(BaseModel):
    email: EmailStr

class RefreshRequest(BaseModel):
    refresh_token: str

class MessageResponse(BaseModel):
    message: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

# ── Helper ────────────────────────────────────────────────────────────────────

OTP_TTL_MINUTES = 10   # OTP valid for 10 minutes

def _set_new_otp(user: models.User) -> str:
    """Generate a fresh OTP, store it on the user object, and return the code."""
    otp = auth_service.generate_otp()
    user.otp_code       = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)
    return otp

# ── POST /api/auth/register ───────────────────────────────────────────────────

@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")   # Strict limit to prevent abuse / account enumeration
def register(request: Request, user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account.

    - Creates the user record with hashed password.
    - Generates a 6-digit OTP valid for 10 minutes.
    - Sends OTP to the provided email via Resend.
    - Does NOT return an access token — user must verify email first.
    """
    # Check for duplicate email
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user (is_verified=False by default)
    hashed_pw = auth_service.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_pw,
        full_name=user_in.full_name,
    )
    db.add(new_user)
    db.flush()   # Get the id without committing yet

    # Generate and store OTP
    otp = _set_new_otp(new_user)
    db.commit()
    db.refresh(new_user)

    # Send OTP email (non-blocking failure — log but don't crash)
    email_sent = send_otp_email(new_user.email, otp)
    if not email_sent:
        print(f"[auth] Warning: OTP email failed for {new_user.email}")

    return {"message": "Registration successful. Please verify your email."}

# ── POST /api/auth/verify-email ───────────────────────────────────────────────

@router.post("/verify-email", response_model=TokenResponse)
@limiter.limit("10/minute")   # Prevent OTP brute-force
def verify_email(request: Request, body: OTPVerify, db: Session = Depends(get_db)):
    """
    Verify email with the OTP code.

    - Checks OTP code and expiry.
    - Marks user as verified.
    - Issues access_token + refresh_token (first-time login equivalent).
    """
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    if not auth_service.verify_otp(user, body.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )

    # Mark verified and clear OTP fields
    user.is_verified    = True
    user.otp_code       = None
    user.otp_expires_at = None

    # Issue tokens
    access_token  = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})

    # Store hashed refresh token in DB
    user.refresh_token = auth_service.get_password_hash(refresh_token)

    db.commit()

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
    }

# ── POST /api/auth/resend-otp ────────────────────────────────────────────────

@router.post("/resend-otp", response_model=MessageResponse)
def resend_otp(body: ResendOTP, db: Session = Depends(get_db)):
    """
    Resend the OTP to an unverified user's email.
    Generates a fresh OTP, updates the database, and resends the email.
    """
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    # Generate fresh OTP
    otp = _set_new_otp(user)
    db.commit()

    send_otp_email(user.email, otp)

    return {"message": "OTP resent successfully"}

# ── POST /api/auth/login ──────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")   # Prevent brute-force login attempts
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Authenticate a verified user and return access + refresh tokens.

    - Returns 401 for wrong credentials.
    - Returns 403 if the email has not been verified.
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    if not user or not auth_service.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Guard: must verify email first
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in"
        )

    # Issue tokens
    access_token  = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})

    # Store hashed refresh token in DB
    user.refresh_token = auth_service.get_password_hash(refresh_token)
    db.commit()

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
    }

# ── POST /api/auth/refresh ────────────────────────────────────────────────────

@router.post("/refresh", response_model=AccessTokenResponse)
def refresh_access_token(body: RefreshRequest, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh token for a new access token.

    - Decodes the refresh JWT.
    - Verifies the stored hash matches (prevents replay if token is cleared).
    - Returns a new short-lived access token.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = auth_service.decode_refresh_token(body.refresh_token)
    if payload is None:
        raise credentials_error

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_error

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None or user.refresh_token is None:
        raise credentials_error

    # Verify stored hash matches submitted token
    if not auth_service.verify_password(body.refresh_token, user.refresh_token):
        raise credentials_error

    # Issue new access token
    new_access_token = auth_service.create_access_token(data={"sub": str(user.id)})

    return {"access_token": new_access_token, "token_type": "bearer"}

# ── POST /api/auth/logout ─────────────────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
def logout(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Log out the current user by clearing their stored refresh token.
    Requires a valid Bearer access token.
    """
    current_user.refresh_token = None
    db.commit()
    return {"message": "Logged out successfully"}

# ── POST /api/auth/forgot-password ──────────────────────────────────────────────

@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPassword, db: Session = Depends(get_db)):
    """
    Initiates password reset process cleanly sending OTP to matched email.
    """
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if user:
        otp = _set_new_otp(user)
        db.commit()
        send_password_reset_email(user.email, otp)
    
    # Always return success to prevent email enumeration
    return {"message": "If this email exists, a reset code has been sent"}

# ── POST /api/auth/reset-password ───────────────────────────────────────────────

@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def reset_password(request: Request, body: ResetPassword, db: Session = Depends(get_db)):
    """
    Confirms an OTP verification against an email and patches in new password context.
    """
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not auth_service.verify_otp(user, body.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
        
    user.hashed_password = auth_service.get_password_hash(body.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    
    return {"message": "Password reset successful. Please login."}
