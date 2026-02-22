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


router = APIRouter(prefix="/api/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    is_medical: bool = False
    history: list = []

class ChatSessionResponse(BaseModel):
    session_id: str
    title: str
    created_at: str
    updated_at: str

@router.get("/sessions", response_model=list[ChatSessionResponse])
async def get_chat_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sessions = crud.get_user_chat_sessions(db, current_user.id)
    return [
        {
            "session_id": s.session_id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat()
        }
        for s in sessions
    ]

@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.db.models_chat import ChatSession, ChatMessage
    
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.query(ChatSession).filter(ChatSession.session_id == session_id).delete()
    db.commit()
    
    return {"message": "Session deleted"}

@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not req.session_id or req.session_id.lower() == "string":
        session_id = str(uuid.uuid4())
    else:
        session_id = req.session_id

    # Create or get session
    crud.get_or_create_chat_session(db, session_id, current_user.id)

    # If empty message, just return history
    if not req.message or not req.message.strip():
        history = crud.get_recent_messages(db, session_id, limit=50)
        return {
            "response": "",
            "session_id": session_id,
            "is_medical": False,
            "history": [{"role": msg.role, "content": msg.content} for msg in history]
        }

    if not is_health_related(req.message):
        raise HTTPException(
            status_code=400,
            detail="This assistant only answers health, diet, exercise, and wellness related questions."
        )

    # Save user message
    crud.save_message(db, session_id, current_user.id, "user", req.message)

    is_medical = False
    reply = ""

    # Decide routing - Use general chat for all health questions
    # Get conversation history
    history = crud.get_recent_messages(db, session_id)
    llm_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in history
    ]
    
    # Check if user wants to generate final plan
    plan_keywords = ["generate", "create", "make", "ready", "final plan", "show me the plan"]
    if any(keyword in req.message.lower() for keyword in plan_keywords):
        # Check if this is a consultation session
        first_msg = history[0] if history else None
        if first_msg and first_msg.role == "assistant" and ("nutrition" in first_msg.content.lower() or "fitness" in first_msg.content.lower()):
            # Generate final plan
            from app.services.lifestyle_service import generate_final_plan
            
            plan_type = "nutrition" if "nutrition" in first_msg.content.lower() or "meal" in first_msg.content.lower() else "fitness"
            conversation = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
            
            reply = await generate_final_plan(profile, plan_type, conversation, lab_summary)
            crud.save_message(db, session_id, current_user.id, "assistant", reply)
            
            return {
                "response": reply,
                "session_id": session_id,
                "is_medical": False
            }
    
    # Inject lab context and profile
    lab_summary = crud.get_latest_lab_summary(db, current_user.id)
    profile = crud.get_health_profile(db, current_user.id)
    
    context_parts = []
    if profile:
        context_parts.append(f"Patient: {profile.age}yo {profile.gender}")
        if profile.blood_type:
            context_parts.append(f"Blood Type: {profile.blood_type}")
        if profile.known_conditions:
            context_parts.append(f"Conditions: {profile.known_conditions}")
    
    if lab_summary:
        context_parts.append(lab_summary)
    
    if context_parts:
        system_context = "You are a helpful healthcare assistant.\n\n" + "\n".join(context_parts)
        llm_messages.insert(0, {"role": "system", "content": system_context})
    
    # Get response from Groq
    reply = await medical_llm_response(llm_messages)
    
    # ===== SAFETY VALIDATION =====
    safety_guard = get_safety_guard()
    safety_result = safety_guard.validate(
        text=reply,
        user_context=req.message
    )
    
    # Handle safety actions
    if safety_result["action"] == SafetyAction.EMERGENCY_REDIRECT:
        final_response = safety_result["sanitized_text"]
        is_medical = True
    elif safety_result["action"] == SafetyAction.SANITIZE:
        final_response = safety_result["sanitized_text"] + medical_disclaimer()
    else:
        final_response = reply + medical_disclaimer()
    
    # Log safety flags if any
    if safety_result["flags"]:
        print(f"Safety flags triggered: {safety_result['flags']}")
    
    # Save assistant reply
    crud.save_message(db, session_id, current_user.id, "assistant", final_response)

    return {
        "response": final_response,
        "session_id": session_id,
        "is_medical": is_medical
    }
