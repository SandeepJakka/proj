from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.db.deps import get_db, get_current_user
from app.db import models
from app.db.models_reminders import MedicineReminder
import json

router = APIRouter(prefix="/api/reminders", tags=["Medicine Reminders"])

class ReminderCreate(BaseModel):
    medicine_name: str
    dosage: Optional[str] = None
    frequency: str  # once_daily, twice_daily, three_times, custom
    reminder_times: List[str]  # ["08:00", "20:00"]
    instructions: Optional[str] = None
    end_date: Optional[str] = None

class ReminderUpdate(BaseModel):
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    reminder_times: Optional[List[str]] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/")
def get_reminders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminders = db.query(MedicineReminder).filter(
        MedicineReminder.user_id == current_user.id,
        MedicineReminder.is_active == True
    ).order_by(MedicineReminder.created_at.desc()).all()
    
    result = []
    for r in reminders:
        times = json.loads(r.reminder_times) if isinstance(r.reminder_times, str) else r.reminder_times
        result.append({
            "id": r.id,
            "medicine_name": r.medicine_name,
            "dosage": r.dosage,
            "frequency": r.frequency,
            "reminder_times": times,
            "instructions": r.instructions,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "end_date": r.end_date.isoformat() if r.end_date else None
        })
    return {"reminders": result}

@router.post("/")
def create_reminder(
    data: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminder = MedicineReminder(
        user_id=current_user.id,
        medicine_name=data.medicine_name,
        dosage=data.dosage,
        frequency=data.frequency,
        reminder_times=json.dumps(data.reminder_times),
        instructions=data.instructions,
    )
    if data.end_date:
        reminder.end_date = datetime.fromisoformat(data.end_date)
    
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return {"message": "Reminder created", "id": reminder.id}

@router.put("/{reminder_id}")
def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminder = db.query(MedicineReminder).filter(
        MedicineReminder.id == reminder_id,
        MedicineReminder.user_id == current_user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    update_data = data.dict(exclude_unset=True)
    if 'reminder_times' in update_data:
        update_data['reminder_times'] = json.dumps(update_data['reminder_times'])
    
    for key, value in update_data.items():
        setattr(reminder, key, value)
    
    db.commit()
    return {"message": "Reminder updated"}

@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminder = db.query(MedicineReminder).filter(
        MedicineReminder.id == reminder_id,
        MedicineReminder.user_id == current_user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted"}
