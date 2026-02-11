from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from app.db.deps import get_db, get_current_user
from app.db import crud, models
from app.safety.filters import is_health_related
from app.safety.disclaimers import medical_disclaimer
from app.safety.output_guard import get_safety_guard, SafetyAction
from app.services.llm_service import medical_llm_response

from app.utils.intent_detector import needs_medical_reasoning
from app.services.medical_reasoning_service import run_medical_reasoning
from app.services.llm_service import simplify_medical_text


router = APIRouter(prefix="/api/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    is_medical: bool = False

@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not is_health_related(req.message):
        raise HTTPException(
            status_code=400,
            detail="This assistant only answers health, diet, exercise, and wellness related questions."
        )

    if not req.session_id or req.session_id.lower() == "string":
        session_id = str(uuid.uuid4())
    else:
        session_id = req.session_id

    # Save user message
    crud.save_message(db, session_id, "user", req.message)

    is_medical = False
    reply = ""

    # Decide routing
    if needs_medical_reasoning(req.message):
        # 🔵 MEDICAL PATH
        is_medical = True
        medical_output = await run_medical_reasoning(
            symptoms=[req.message],
            db=db,
            user_id=current_user.id
        )

        structured_text = (
            f"Findings: {', '.join(medical_output['findings'])}\n"
            f"Explanation: {medical_output['explanation']}\n"
            f"Confidence: {medical_output['confidence']}"
        )

        reply = await simplify_medical_text(structured_text)

    else:
        # 🟢 GENERAL CHAT PATH
        history = crud.get_recent_messages(db, session_id)
        llm_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in history
        ]
        # Get response from Groq
        reply = await medical_llm_response(llm_messages)
    
    # ===== SAFETY VALIDATION =====
    # All LLM outputs MUST pass through centralized safety guard
    safety_guard = get_safety_guard()
    safety_result = safety_guard.validate(
        text=reply,
        user_context=req.message
    )
    
    # Handle safety actions
    if safety_result["action"] == SafetyAction.EMERGENCY_REDIRECT:
        # Emergency detected - override response with guidance
        final_response = safety_result["sanitized_text"]
        is_medical = True  # Mark as medical for frontend highlighting
    elif safety_result["action"] == SafetyAction.SANITIZE:
        # Use sanitized version (diagnoses redacted)
        final_response = safety_result["sanitized_text"] + medical_disclaimer()
    else:
        # Safe to display as-is
        final_response = reply + medical_disclaimer()
    
    # Log safety flags if any
    if safety_result["flags"]:
        print(f"Safety flags triggered: {safety_result['flags']}")
    
    # Save assistant reply
    crud.save_message(db, session_id, "assistant", final_response)

    return {
        "response": final_response,
        "session_id": session_id,
        "is_medical": is_medical
    }
