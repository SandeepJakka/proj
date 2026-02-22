from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.deps import get_db, get_current_user
from app.db import crud, models

router = APIRouter(prefix="/api/profile", tags=["Health Profile"])

class HealthProfileBase(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_type: Optional[str] = None
    activity_level: Optional[str] = None
    dietary_preferences: Optional[str] = None
    known_conditions: Optional[str] = None
    allergies: Optional[str] = None

class HealthProfileCreate(HealthProfileBase):
    pass

class HealthProfileResponse(HealthProfileBase):
    user_id: int
    id: int
    
    class Config:
        from_attributes = True

@router.get("/", response_model=Optional[HealthProfileResponse])
def get_profile(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    profile = crud.get_health_profile(db, user_id=current_user.id)
    if not profile:
        return None
    return profile

@router.put("/", response_model=HealthProfileResponse)
def update_profile(data: HealthProfileCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    profile = crud.create_or_update_health_profile(db, current_user.id, data.dict(exclude_unset=True))
    return profile
