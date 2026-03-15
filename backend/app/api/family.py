from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.deps import get_db, get_current_user
from app.db import models

router = APIRouter(prefix="/api/family", tags=["Family Vault"])

AVATAR_COLORS = [
    '#2563EB', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
]


class MemberCreate(BaseModel):
    name: str
    relation: str
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    known_conditions: Optional[str] = None
    allergies: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    notes: Optional[str] = None


class MemberUpdate(MemberCreate):
    pass


@router.get("/members")
def get_members(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_family import FamilyMember, FamilyMemberReport

    members = db.query(FamilyMember).filter(
        FamilyMember.user_id == current_user.id
    ).order_by(FamilyMember.created_at).all()

    result = []
    for m in members:
        reports = db.query(FamilyMemberReport).filter(
            FamilyMemberReport.member_id == m.id
        ).order_by(FamilyMemberReport.created_at.desc()).all()
        result.append({
            "id": m.id,
            "name": m.name,
            "relation": m.relation,
            "age": m.age,
            "gender": m.gender,
            "blood_type": m.blood_type,
            "known_conditions": m.known_conditions,
            "allergies": m.allergies,
            "weight_kg": m.weight_kg,
            "height_cm": m.height_cm,
            "notes": m.notes,
            "avatar_color": m.avatar_color,
            "report_count": len(reports),
            "reports": [{
                "id": r.id,
                "filename": r.filename,
                "file_type": r.file_type,
                "has_file": bool(r.local_path),
                "report_type": r.report_type,
                "summary_text": r.summary_text,
                "created_at": r.created_at.isoformat()
            } for r in reports],
            "created_at": m.created_at.isoformat()
        })
    return result


@router.post("/members")
def create_member(
    data: MemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_family import FamilyMember

    count = db.query(FamilyMember).filter(
        FamilyMember.user_id == current_user.id
    ).count()
    if count >= 8:
        raise HTTPException(status_code=400, detail="Maximum 8 family members allowed")

    color = AVATAR_COLORS[count % len(AVATAR_COLORS)]

    member = FamilyMember(
        user_id=current_user.id,
        avatar_color=color,
        **data.dict()
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return {"id": member.id, "message": "Member added"}


@router.put("/members/{member_id}")
def update_member(
    member_id: int,
    data: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_family import FamilyMember

    member = db.query(FamilyMember).filter(
        FamilyMember.id == member_id,
        FamilyMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(member, key, value)
    db.commit()
    return {"message": "Member updated"}


@router.delete("/members/{member_id}")
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_family import FamilyMember, FamilyMemberReport

    member = db.query(FamilyMember).filter(
        FamilyMember.id == member_id,
        FamilyMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.query(FamilyMemberReport).filter(
        FamilyMemberReport.member_id == member_id
    ).delete()
    db.delete(member)
    db.commit()
    return {"message": "Member deleted"}


@router.post("/members/{member_id}/reports")
async def upload_member_report(
    member_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_family import FamilyMember, FamilyMemberReport
    from app.utils.file_handler import validate_upload_file, save_upload_bytes
    from app.services.report_analyzer import analyze_report

    member = db.query(FamilyMember).filter(
        FamilyMember.id == member_id,
        FamilyMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    file_bytes = await validate_upload_file(file)
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    local_path, _ = await save_upload_bytes(file_bytes, file.filename)

    # Analyze with AI
    result = await analyze_report(
        file_bytes=file_bytes,
        filename=file.filename,
        language="english"
    )

    summary = ""
    report_type = ""
    if result.get("success"):
        summary = result.get("explanation", "")[:500]
        report_type = result.get("document_type", "")

    report = FamilyMemberReport(
        member_id=member_id,
        user_id=current_user.id,
        filename=file.filename,
        file_type=ext,
        local_path=local_path,
        summary_text=summary,
        report_type=report_type
    )
    db.add(report)
    db.commit()

    return {
        "message": "Report uploaded",
        "filename": file.filename,
        "report_type": report_type,
        "summary": summary[:200] if summary else ""
    }


@router.delete("/members/{member_id}/reports/{report_id}")
def delete_member_report(
    member_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_family import FamilyMemberReport

    report = db.query(FamilyMemberReport).filter(
        FamilyMemberReport.id == report_id,
        FamilyMemberReport.member_id == member_id,
        FamilyMemberReport.user_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    db.delete(report)
    db.commit()
    return {"message": "Report deleted"}


@router.get("/members/{member_id}/reports/{report_id}/download")
def download_member_report(
    member_id: int,
    report_id: int,
    inline: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Serve the original uploaded file — as attachment (download) or inline (view)."""
    import os
    from fastapi.responses import FileResponse
    from app.db.models_family import FamilyMemberReport

    report = db.query(FamilyMemberReport).filter(
        FamilyMemberReport.id == report_id,
        FamilyMemberReport.member_id == member_id,
        FamilyMemberReport.user_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if not report.local_path or not os.path.exists(report.local_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    # Map extension to MIME type
    mime_map = {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
    }
    ext = (report.file_type or "").lower().lstrip(".")
    media_type = mime_map.get(ext, "application/octet-stream")

    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path=report.local_path,
        media_type=media_type,
        filename=report.filename,
        headers={
            "Content-Disposition": f'{disposition}; filename="{report.filename}"'
        }
    )

