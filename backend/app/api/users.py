from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.db import crud

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.post("/")
def create_user(email: str | None = None, db: Session = Depends(get_db)):
    user = crud.create_user(db, email)
    return {
        "id": user.id,
        "email": user.email,
        "created_at": user.created_at
    }

@router.get("/")
def list_users(db: Session = Depends(get_db)):
    users = crud.get_users(db)
    return users

from app.db.models import User
from app.db.deps import get_current_user

@router.get("/me")
def get_user_me(current_user: User = Depends(get_current_user)):
    """Returns the profile info for the logged-in user."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

from pydantic import BaseModel
class UserUpdate(BaseModel):
    full_name: str | None = None

@router.put("/me")
def update_user_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update current user's profile info (e.g. full name)."""
    if data.full_name is not None:
        current_user.full_name = data.full_name
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email
    }
