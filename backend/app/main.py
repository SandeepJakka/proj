"""
main.py
───────
Healthora FastAPI application entry point.

Changes in Phase 0:
  • CORS restricted to localhost origins (see settings.ALLOWED_ORIGINS)
  • slowapi rate limiting added (60 req/min default, 10 req/min on auth endpoints)
"""

import os
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db.database import engine
from app.db import models
from app.db.models_lab_values import LabValue
from app.db.models_chat import ChatSession, ChatMessage
from app.db.models_reports import Report, ReportExtract
from app.db.models_profile import HealthProfile
from app.db.models_reminders import MedicineReminder
from app.db.models_plans import HealthPlan
from app.api import users, chat, medical, reports, profile, lifestyle, auth, reminders
from app.db.models_insurance import InsurancePolicy
from app.db.models_family import FamilyMember, FamilyMemberReport
from app.api import news

# ── Rate Limiter ──────────────────────────────────────────────────────────────
# Uses client IP address as the key for rate limiting.
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Healthora API",
    description="AI-powered healthcare assistant backend",
    version="1.0.0"
)

# Attach rate limiter state and error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS (restricted to known frontend origins) ───────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,   # ["http://localhost:5173", "http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup: create all DB tables ────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    models.Base.metadata.create_all(bind=engine)
    from app.services.reminder_scheduler import start_scheduler
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    from app.services.reminder_scheduler import stop_scheduler
    stop_scheduler()

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(medical.router)
app.include_router(reports.router)
app.include_router(profile.router)
app.include_router(lifestyle.router)
app.include_router(auth.router)
app.include_router(reminders.router)
from app.api import medicines
app.include_router(medicines.router)
from app.api import insurance
app.include_router(insurance.router)
from app.api import family
app.include_router(family.router)
app.include_router(news.router)
from app.api import rag
app.include_router(rag.router)

# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Healthora backend is running 🚀"}
