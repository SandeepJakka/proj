from fastapi import APIRouter, UploadFile, File, Depends, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json

from app.db.deps import get_db, get_current_user
from app.db.models import User
from app.db.models_insurance import InsurancePolicy
from app.services import insurance_service

router = APIRouter(prefix="/api/insurance", tags=["Insurance"])

@router.get("/policies")
async def get_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policies = db.query(InsurancePolicy).filter(InsurancePolicy.user_id == current_user.id).all()
    return policies

@router.post("/upload-policy")
async def upload_policy(
    file: UploadFile = File(...),
    policy_name: str = Form(...),
    policy_number: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        file_bytes = await file.read()
        policy = await insurance_service.process_and_save_policy(
            db, current_user.id, file_bytes, file.filename, policy_name, policy_number
        )
        return {
            "message": "Policy uploaded and analyzed successfully",
            "policy_id": policy.id,
            "policy_name": policy.policy_name
        }
    except Exception as e:
        import traceback
        print(f"Policy upload error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/policies/{policy_id}")
async def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(InsurancePolicy).filter(
        InsurancePolicy.id == policy_id, 
        InsurancePolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    db.delete(policy)
    db.commit()
    return {"message": "Policy deleted successfully"}

@router.post("/check-claim")
async def check_claim(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy_id = body.get("policy_id")
    situation = body.get("situation")
    language = body.get("language", "english")
    
    policy = db.query(InsurancePolicy).filter(
        InsurancePolicy.id == policy_id, 
        InsurancePolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    result = await insurance_service.check_insurance_claim(policy, situation, language=language)
    return result

@router.post("/check-claim-with-bill")
async def check_claim_with_bill(
    file: UploadFile = File(...),
    policy_id: int = Form(...),
    situation: str = Form(...),
    language: str = Form("english"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(InsurancePolicy).filter(
        InsurancePolicy.id == policy_id, 
        InsurancePolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    file_bytes = await file.read()
    result = await insurance_service.check_insurance_claim(
        policy, situation, file_bytes, file.filename, language=language
    )
    return result

@router.post("/chat")
async def chat_with_policy(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy_id = body.get("policy_id")
    question = body.get("question")
    chat_history = body.get("chat_history", [])
    language = body.get("language", "english")
    
    policy = db.query(InsurancePolicy).filter(
        InsurancePolicy.id == policy_id, 
        InsurancePolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    response = await insurance_service.chat_with_policy(
        policy, question, chat_history, language=language
    )
    return {"response": response}
