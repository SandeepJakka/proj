from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid

from app.db.deps import get_db, get_current_user
from app.db import crud, models
from app.services.lifestyle_service import start_plan_consultation

router = APIRouter(prefix="/api/lifestyle", tags=["Lifestyle Intelligence"])

class PlanRequest(BaseModel):
    goal: Optional[str] = "General Health"

class PlanResponse(BaseModel):
    markdown_plan: str

class ConsultationResponse(BaseModel):
    session_id: str
    initial_message: str

@router.post("/diet/consult", response_model=ConsultationResponse)
async def start_diet_consultation(req: PlanRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    profile = crud.get_health_profile(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Health Profile not found. Please set up your profile first.")
    
    session_id = str(uuid.uuid4())
    crud.get_or_create_chat_session(db, session_id, current_user.id)
    
    lab_summary = crud.get_latest_lab_summary(db, current_user.id, limit=10)
    
    initial_msg = await start_plan_consultation(profile, "nutrition", lab_summary)
    crud.save_message(db, session_id, current_user.id, "assistant", initial_msg)
    
    return {"session_id": session_id, "initial_message": initial_msg}

@router.post("/workout/consult", response_model=ConsultationResponse)
async def start_workout_consultation(req: PlanRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    profile = crud.get_health_profile(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Health Profile not found. Please set up your profile first.")
    
    session_id = str(uuid.uuid4())
    crud.get_or_create_chat_session(db, session_id, current_user.id)
    
    lab_summary = crud.get_latest_lab_summary(db, current_user.id, limit=10)
    
    initial_msg = await start_plan_consultation(profile, "fitness", lab_summary)
    crud.save_message(db, session_id, current_user.id, "assistant", initial_msg)
    
    return {"session_id": session_id, "initial_message": initial_msg}
