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

class PlanSave(BaseModel):
    plan_type: str
    plan_content: str
    goal: Optional[str] = None

@router.get("/plans")
def get_health_plans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.db.models_plans import HealthPlan
    
    plans = db.query(HealthPlan).filter(
        HealthPlan.user_id == current_user.id,
        HealthPlan.is_current == True
    ).order_by(HealthPlan.created_at.desc()).all()
    
    result = []
    for plan in plans:
        result.append({
            "id": plan.id,
            "plan_type": plan.plan_type,
            "plan_content": plan.plan_content,
            "goal": plan.goal,
            "created_at": plan.created_at.isoformat() if plan.created_at else None
        })
    
    return {"plans": result}

@router.post("/plans/save")
def save_health_plan(data: PlanSave, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.db.models_plans import HealthPlan
    
    # Mark previous plans of same type as not current
    db.query(HealthPlan).filter(
        HealthPlan.user_id == current_user.id,
        HealthPlan.plan_type == data.plan_type
    ).update({"is_current": False})
    
    # Create new plan
    plan = HealthPlan(
        user_id=current_user.id,
        plan_type=data.plan_type,
        plan_content=data.plan_content,
        goal=data.goal,
        is_current=True
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    return {"message": "Plan saved", "id": plan.id}

@router.get("/plans/current")
def get_current_plans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.db.models_plans import HealthPlan
    
    nutrition = db.query(HealthPlan).filter(
        HealthPlan.user_id == current_user.id,
        HealthPlan.plan_type == "nutrition",
        HealthPlan.is_current == True
    ).order_by(HealthPlan.created_at.desc()).first()
    
    fitness = db.query(HealthPlan).filter(
        HealthPlan.user_id == current_user.id,
        HealthPlan.plan_type == "fitness",
        HealthPlan.is_current == True
    ).order_by(HealthPlan.created_at.desc()).first()
    
    result = {}
    if nutrition:
        result["nutrition"] = {
            "id": nutrition.id,
            "plan_content": nutrition.plan_content,
            "goal": nutrition.goal,
            "created_at": nutrition.created_at.isoformat() if nutrition.created_at else None
        }
    if fitness:
        result["fitness"] = {
            "id": fitness.id,
            "plan_content": fitness.plan_content,
            "goal": fitness.goal,
            "created_at": fitness.created_at.isoformat() if fitness.created_at else None
        }
    
    return result
