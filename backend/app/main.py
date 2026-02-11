from fastapi import FastAPI
from app.db.database import engine
from app.db import models
from app.db.models_lab_values import LabValue  # Import new model
from app.api import users, chat, medical, reports, profile, lifestyle, auth


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Healthora API",
    description="AI-powered healthcare assistant backend",
    version="0.1.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    models.Base.metadata.create_all(bind=engine)

app.include_router(users.router)
app.include_router(chat.router)
app.include_router(medical.router)
app.include_router(reports.router)
app.include_router(profile.router)
app.include_router(lifestyle.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "Healthora backend is running 🚀"}
