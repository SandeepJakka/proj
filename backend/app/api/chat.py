import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from app.db.deps import get_db, get_current_user
from app.db import crud, models
from app.safety.filters import is_health_related
from app.safety.disclaimers import medical_disclaimer
from app.safety.output_guard import get_safety_guard, SafetyAction
from app.services.llm_service import get_health_response
from app.utils.intent_detector import detect_language


router = APIRouter(prefix="/api/chat", tags=["Chat"])

class ChatMessagePayload(BaseModel):
    role: str
    content: str

class GuestChatRequest(BaseModel):
    messages: list[ChatMessagePayload]
    language: str = "english"
    guest_session_id: str | None = None

class ChatRequest(BaseModel):
    message: str
    language: str = "english"
    session_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    session_id: str | None = None
    language: str = "english"
    is_medical: bool = False
    is_guest: bool = False
    
class ChatSessionResponse(BaseModel):
    session_id: str
    title: str
    created_at: str
    updated_at: str

@router.post("/guest", response_model=ChatResponse)
async def chat_guest(req: GuestChatRequest):
    """
    Guest chat endpoint - no DB saving. We pass the whole history array.
    """
    # Quick health filter on the last message
    if not req.messages:
        raise HTTPException(status_code=400, detail="Empty messages.")

    last_user_msg = req.messages[-1].content
    if not is_health_related(last_user_msg):
        raise HTTPException(
            status_code=400,
            detail="This assistant only answers health, diet, exercise, and wellness related questions."
        )

    # Convert to standard dict list
    llm_messages = [{"role": m.role, "content": m.content} for m in req.messages]

    detected_lang = detect_language(last_user_msg) if req.language == "english" else req.language

    reply = await get_health_response(
        messages=llm_messages, 
        user_context=None, 
        language=detected_lang
    )

    # Safety Validate
    safety_guard = get_safety_guard()
    safety_result = safety_guard.validate(text=reply, user_context=last_user_msg)

    if safety_result["action"] == SafetyAction.EMERGENCY_REDIRECT:
        final_response = safety_result["sanitized_text"]
        is_medical = True
    elif safety_result["action"] == SafetyAction.SANITIZE:
        final_response = safety_result["sanitized_text"] + medical_disclaimer(detected_lang)
        is_medical = False
    else:
        final_response = reply + medical_disclaimer(detected_lang)
        is_medical = False

    session_id = req.guest_session_id or str(uuid.uuid4())

    return {
        "response": final_response,
        "session_id": session_id,
        "language": detected_lang,
        "is_medical": is_medical,
        "is_guest": True
    }


@router.post("/", response_model=ChatResponse)
async def chat_logged_in(req: ChatRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    LoggedIn chat endpoint. Handles persistence and loads prior messages up to 20 for context.
    """
    if not req.session_id or req.session_id.lower() == "string":
        session_id = str(uuid.uuid4())
    else:
        session_id = req.session_id

    crud.get_or_create_chat_session(db, session_id, current_user.id)

    if not req.message or not req.message.strip():
        return {
            "response": "Empty message",
            "session_id": session_id,
        }

    if not is_health_related(req.message):
        raise HTTPException(
            status_code=400,
            detail="This assistant only answers health, diet, exercise, and wellness related questions."
        )

    crud.save_message(db, session_id, current_user.id, "user", req.message)
    detected_lang = detect_language(req.message) if req.language == "english" else req.language

    # Fetch last 20 messages for history
    history = crud.get_recent_messages(db, session_id, limit=20)
    llm_messages = [{"role": msg.role, "content": msg.content} for msg in history]

    # Load context
    lab_summary = crud.get_latest_lab_summary(db, current_user.id)
    profile = crud.get_health_profile(db, current_user.id)

    user_context = {}
    if profile:
        user_context["Age/Gender"] = f"{profile.age}yo {profile.gender}"
        if profile.blood_type:
            user_context["Blood_Type"] = profile.blood_type
        if profile.known_conditions:
            user_context["Conditions"] = profile.known_conditions
    if lab_summary:
        user_context["Latest_Labs"] = lab_summary

    reply = await get_health_response(
        messages=llm_messages,
        user_context=user_context,
        language=detected_lang
    )

    safety_guard = get_safety_guard()
    safety_result = safety_guard.validate(text=reply, user_context=req.message)

    is_medical = False
    if safety_result["action"] == SafetyAction.EMERGENCY_REDIRECT:
        final_response = safety_result["sanitized_text"]
        is_medical = True
    elif safety_result["action"] == SafetyAction.SANITIZE:
        final_response = safety_result["sanitized_text"] + medical_disclaimer(detected_lang)
    else:
        final_response = reply + medical_disclaimer(detected_lang)

    crud.save_message(db, session_id, current_user.id, "assistant", final_response)

    return {
        "response": final_response,
        "session_id": session_id,
        "language": detected_lang,
        "is_medical": is_medical
    }


@router.get("/history")
async def get_chat_history(session_id: str | None = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Get chat messages. If session_id provided, returns that session's messages (decrypted).
    Otherwise returns all sessions with previews (decrypted).
    """
    if session_id:
        # Single session — use crud which decrypts
        messages = crud.get_recent_messages(db, session_id, limit=100)
        return {
            "session_id": session_id,
            "messages": [
                {
                    "role": m.role,
                    "content": m.content,  # Already decrypted by crud
                    "created_at": m.created_at.isoformat() if m.created_at else None
                }
                for m in messages
            ]
        }
    
    # All sessions — decrypt each, return structured
    sessions = crud.get_user_chat_sessions(db, current_user.id)
    result = []
    for session in sessions:
        messages = crud.get_recent_messages(db, session.session_id, limit=100)
        result.append({
            "session_id": session.session_id,
            "title": session.title or "Chat Session",
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "updated_at": session.updated_at.isoformat() if session.updated_at else None,
            "messages": [
                {
                    "role": m.role,
                    "content": m.content,  # Already decrypted by crud
                    "created_at": m.created_at.isoformat() if m.created_at else None
                }
                for m in messages
            ],
            "preview": messages[0].content[:40] if messages else "New Chat"
        })
    return {"sessions": result}




@router.delete("/history")
async def clear_chat_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Clears all chat history for the user.
    """
    from app.db.models_chat import ChatSession, ChatMessage
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    db.query(ChatSession).filter(ChatSession.user_id == current_user.id).delete()
    db.commit()

    return {"message": "Chat history cleared"}


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
