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

class ProfileSharingUpdate(BaseModel):
    username: Optional[str] = None
    profile_public: Optional[bool] = None
    public_fields: Optional[list] = None

@router.get("/sharing")
def get_profile_sharing(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    import json
    public_fields = []
    if current_user.public_fields:
        try:
            public_fields = json.loads(current_user.public_fields) if isinstance(current_user.public_fields, str) else current_user.public_fields
        except:
            public_fields = []
    
    return {
        "username": current_user.username,
        "profile_public": current_user.profile_public,
        "public_fields": public_fields
    }

@router.put("/sharing")
def update_profile_sharing(data: ProfileSharingUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    import json
    import re
    
    if data.username is not None:
        # Validate username
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', data.username):
            raise HTTPException(status_code=400, detail="Username must be 3-20 characters, alphanumeric and underscore only")
        
        # Check if username taken
        existing = db.query(models.User).filter(
            models.User.username == data.username,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        current_user.username = data.username
    
    if data.profile_public is not None:
        current_user.profile_public = data.profile_public
    
    if data.public_fields is not None:
        current_user.public_fields = json.dumps(data.public_fields)
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Sharing settings updated",
        "username": current_user.username,
        "profile_public": current_user.profile_public
    }

@router.get("/public/{username}")
def get_public_profile(username: str, db: Session = Depends(get_db)):
    import json
    from app.db.models_reports import Report
    from app.db import crud as db_crud

    user = db.query(models.User).filter(
        models.User.username == username
    ).first()
    if not user or not user.profile_public:
        raise HTTPException(status_code=404, detail="Profile not found")

    public_fields = []
    if user.public_fields:
        try:
            public_fields = json.loads(user.public_fields) \
                if isinstance(user.public_fields, str) \
                else user.public_fields
        except:
            public_fields = []

    profile = db_crud.get_health_profile(db, user_id=user.id)
    result = {"username": username}

    allowed_profile = {
        "full_name", "age", "gender", "blood_type",
        "known_conditions", "allergies", "activity_level"
    }

    if "full_name" in public_fields and user.full_name:
        result["full_name"] = user.full_name

    if profile:
        for field in public_fields:
            if field in allowed_profile and hasattr(profile, field):
                value = getattr(profile, field)
                if value:
                    result[field] = value

    # Health summary — BMI + conditions overview
    if "health_summary" in public_fields and profile:
        summary = {}
        if profile.weight_kg and profile.height_cm and profile.height_cm > 0:
            bmi = round(
                profile.weight_kg / ((profile.height_cm / 100) ** 2), 1
            )
            if bmi < 18.5:
                bmi_category = "Underweight"
            elif bmi < 25:
                bmi_category = "Normal weight"
            elif bmi < 30:
                bmi_category = "Overweight"
            else:
                bmi_category = "Obese"
            summary["bmi"] = bmi
            summary["bmi_category"] = bmi_category
        if profile.known_conditions:
            summary["conditions"] = profile.known_conditions[:200]
        if profile.activity_level:
            summary["activity_level"] = profile.activity_level
        if summary:
            result["health_summary"] = summary

    # Recent reports — last 5, summaries only (200 chars max)
    if "reports" in public_fields:
        reports = db.query(Report).filter(
            Report.user_id == user.id
        ).order_by(Report.created_at.desc()).limit(5).all()

        report_list = []
        for report in reports:
            extract = db_crud.get_report_extract(db, report.id)
            report_list.append({
                "filename": report.filename,
                "report_type": report.report_type or "Medical Report",
                "date": report.created_at.isoformat() \
                    if report.created_at else None,
                "summary": (extract.summary_text[:200] + "...") \
                    if extract and extract.summary_text \
                    and len(extract.summary_text) > 200 \
                    else (extract.summary_text if extract else None)
            })
        if report_list:
            result["reports"] = report_list

    return result

