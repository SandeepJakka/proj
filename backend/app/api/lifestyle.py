from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.deps import get_db, get_current_user
from app.db import crud, models
from app.services.lifestyle_service import generate_diet_plan, generate_workout_plan

router = APIRouter(prefix="/api/lifestyle", tags=["Lifestyle Intelligence"])

class PlanRequest(BaseModel):
    goal: Optional[str] = "General Health"

class PlanResponse(BaseModel):
    markdown_plan: str

@router.post("/diet", response_model=PlanResponse)
async def get_diet_plan(req: PlanRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    profile = crud.get_health_profile(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Health Profile not found. Please set up your profile first.")
    
    plan = await generate_diet_plan(profile, goal=req.goal or "General Health")
    return {"markdown_plan": plan}

@router.post("/workout", response_model=PlanResponse)
async def get_workout_plan(req: PlanRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    profile = crud.get_health_profile(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Health Profile not found. Please set up your profile first.")
    
    plan = await generate_workout_plan(profile, goal=req.goal or "General Fitness")
    return {"markdown_plan": plan}
