from app.db.deps import get_db
from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/medical", tags=["Medical Reasoning"])

class SymptomInput(BaseModel):
    symptoms: List[str]
    age: Optional[int] = None
    gender: Optional[str] = None

class MedicalReasoningResponse(BaseModel):
    findings: List[str]
    explanation: str
    confidence: str

@router.post("/reason", response_model=MedicalReasoningResponse)
async def medical_reasoning(data: SymptomInput, db: Session = Depends(get_db)):
    """
    Placeholder for MediPhi / Medical-LLaMA output.
    """
    # Call the actual medical reasoning service
    from app.services.medical_reasoning_service import run_medical_reasoning
    
    result = await run_medical_reasoning(
        symptoms=data.symptoms,
        age=data.age,
        gender=data.gender,
        db=db,
        user_id=1 # MOCK USER
    )
    return result
