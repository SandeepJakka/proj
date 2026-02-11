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
