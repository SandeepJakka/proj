from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.db import models
from app.db.models_chat import ChatMessage, ChatSession
from app.db.models_reports import Report, ReportExtract
from app.db.models_profile import HealthProfile
from app.db.models_profile import HealthProfile
from app.utils.encryption import encrypt_text, decrypt_text
import json

def get_health_profile(db: Session, user_id: int):
    return db.query(HealthProfile).filter(HealthProfile.user_id == user_id).first()

def create_or_update_health_profile(db: Session, user_id: int, profile_data: dict):
    profile = get_health_profile(db, user_id)
    if not profile:
        profile = HealthProfile(user_id=user_id, **profile_data)
        db.add(profile)
    else:
        for key, value in profile_data.items():
            setattr(profile, key, value)
    
    db.commit()
    db.refresh(profile)
    return profile

def create_user(db: Session, email: str | None):
    user = models.User(email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_users(db: Session):
    return db.query(models.User).all()

def get_or_create_chat_session(db: Session, session_id: str, user_id: int):
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        session = ChatSession(session_id=session_id, user_id=user_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session

def get_user_chat_sessions(db: Session, user_id: int):
    return db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc()).all()

def save_message(db: Session, session_id: str, user_id: int, role: str, content: str):
    msg = ChatMessage(
        session_id=session_id,
        user_id=user_id,
        role=role,
        content=encrypt_text(content)
    )
    db.add(msg)
    db.commit()
    
    # Update session timestamp
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if session:
        db.query(ChatSession).filter(ChatSession.session_id == session_id).update({"updated_at": func.now()})
        db.commit()

def get_recent_messages(db: Session, session_id: str, limit: int = 6):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()[::-1]
    )
    # Decrypt contents for returning
    for m in messages:
        db.expunge(m)
        m.content = decrypt_text(m.content)
    return messages

def get_latest_lab_summary(db: Session, user_id: int, limit: int = 5) -> str:
    from app.db.models_lab_values import LabValue
    
    labs = db.query(LabValue).filter(
        LabValue.user_id == user_id
    ).order_by(LabValue.created_at.desc()).limit(limit).all()
    
    if not labs:
        return ""
    
    summary_lines = ["Recent Lab Results:"]
    for lab in labs:
        summary_lines.append(f"- {lab.test_name}: {lab.value} {lab.unit} ({lab.status})")
    
    return "\n".join(summary_lines)
def create_report(db, filename: str, file_type: str, user_id: int):
    report = Report(
        filename=filename,
        file_type=file_type,
        user_id=user_id
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

def get_user_reports(db: Session, user_id: int):
    return db.query(Report).filter(Report.user_id == user_id).all()

def create_report_extract(db, report_id: int, raw_text: str, entities: dict, summary: str):
    extract = ReportExtract(
        report_id=report_id,
        raw_text=encrypt_text(raw_text),
        entities_json=encrypt_text(json.dumps(entities)),
        summary_text=encrypt_text(summary)
    )
    db.add(extract)
    db.commit()
    return extract

def get_report_extract(db, report_id: int):
    extract = (
        db.query(ReportExtract)
        .filter(ReportExtract.report_id == report_id)
        .first()
    )
    if extract:
        db.expunge(extract)
        extract.raw_text = decrypt_text(extract.raw_text)
        extract.entities_json = decrypt_text(extract.entities_json)
        extract.summary_text = decrypt_text(extract.summary_text)
        if hasattr(extract, "medical_analysis_json") and extract.medical_analysis_json:
            extract.medical_analysis_json = decrypt_text(extract.medical_analysis_json)
    return extract

def update_report_analysis(db, report_id: int, analysis: dict):
    extract = db.query(ReportExtract).filter(ReportExtract.report_id == report_id).first()
    if extract:
        extract.medical_analysis_json = encrypt_text(json.dumps(analysis))
        db.commit()
        db.refresh(extract)
        
        # We also need to return the fully decrypted representation to callers
        db.expunge(extract)
        extract.raw_text = decrypt_text(extract.raw_text)
        extract.entities_json = decrypt_text(extract.entities_json)
        extract.summary_text = decrypt_text(extract.summary_text)
        extract.medical_analysis_json = decrypt_text(extract.medical_analysis_json)
    return extract
