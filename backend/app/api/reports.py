from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.db.deps import get_db, get_current_user
from app.db import crud, models
from app.utils.file_handler import validate_upload_file, save_upload_bytes
from app.services.report_analyzer import analyze_report
from app.services.analytics_service import analyze_health_trends
from app.safety.disclaimers import medical_disclaimer
from app.utils.intent_detector import detect_language

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/")
def get_reports(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    reports = crud.get_user_reports(db, current_user.id)
    result = []
    for report in reports:
        extract = crud.get_report_extract(db, report.id)
        result.append({
            "id": report.id,
            "filename": report.filename,
            "file_type": report.file_type,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "summary_text": extract.summary_text if extract else None,
            "has_analysis": extract.medical_analysis_json is not None if extract else False,
        })
    return result

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.db.models_lab_values import LabValue
    from app.db.models_reports import Report, ReportExtract
    from app.services.s3_service import delete_from_s3
    
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete from S3 if exists
    if report.s3_key:
        delete_from_s3(report.s3_key)
    
    db.query(LabValue).filter(LabValue.report_id == report_id).delete()
    db.query(ReportExtract).filter(ReportExtract.report_id == report_id).delete()
    db.query(Report).filter(Report.id == report_id).delete()
    db.commit()
    
    return {"message": "Report deleted"}

@router.get("/analytics/trends")
async def get_health_trends(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return await analyze_health_trends(db, current_user.id)

@router.post("/analyze/guest")
async def analyze_report_guest(
    file: UploadFile = File(...), 
    language: str = Form("english")
):
    """
    Guest endpoint: Analyzes report, but does NOT save metadata to DB.
    """
    file_bytes = await validate_upload_file(file)
    detected_lang = language if language != "english" else detect_language("test")  # We can't detect without text, keep english
    
    result = await analyze_report(
        file_bytes=file_bytes, 
        filename=file.filename, 
        language=language
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed."))

    return result

@router.post("/analyze")
async def analyze_report_logged_in(
    file: UploadFile = File(...), 
    language: str = Form("english"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Logged-in User endpoint: Analyzes report and saves metadata to DB.
    """
    file_bytes = await validate_upload_file(file)
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    # Upload to S3
    from app.services.s3_service import upload_report_to_s3
    s3_key = upload_report_to_s3(file_bytes, file.filename, current_user.id)
    
    # Analyze image/PDF directly with Gemini
    result = await analyze_report(
        file_bytes=file_bytes, 
        filename=file.filename, 
        language=language
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed."))

    # Normalize report type
    from app.services.report_comparison_service import normalize_report_type
    document_type = result.get("gemini_extraction", {}).get("document_type", "")
    report_type = normalize_report_type(document_type)
    
    # Step 2: Save to DB since it's a logged in user
    report = crud.create_report(db, file.filename, ext, user_id=current_user.id)
    report.s3_key = s3_key
    report.report_type = report_type
    db.commit()
    
    # Store extraction results
    crud.create_report_extract(
        db, 
        report_id=report.id, 
        raw_text=result["gemini_extraction"].get("raw_findings", ""), 
        entities=result["gemini_extraction"].get("structured_data", {}), 
        summary=result["explanation"]
    )
    
    # Check for previous reports of same type
    from app.db.models_reports import Report
    previous_report = db.query(Report).filter(
        Report.user_id == current_user.id,
        Report.report_type == report_type,
        Report.id != report.id
    ).order_by(Report.created_at.desc()).first()
    
    # Add our report_id to the response
    result["report_id"] = report.id
    result["s3_key"] = s3_key
    result["report_type"] = report_type
    
    if previous_report:
        result["previous_report_available"] = True
        result["previous_report_id"] = previous_report.id
        result["suggestion"] = f"You have a previous {report_type.replace('_', ' ')}. Would you like to compare?"
    
    return result

# ── KEEPING EXISTING ENDPOINTS TO PREVENT BREAKING CHANGES ──

@router.post("/upload")
async def upload_report(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Legacy wrapper around analyze_report_logged_in. 
    Maintains support for endpoints relying on /upload
    """
    return await analyze_report_logged_in(file, "english", db, current_user)

@router.post("/{report_id}/explain")
async def explain_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    report = db.query(models.Report).filter(models.Report.id == report_id, models.Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    extract = crud.get_report_extract(db, report_id)
    if not extract:
        raise HTTPException(status_code=404, detail="Report extract not found. Please re-upload the report.")

    # Parse the structured data from entities_json (already decrypted by crud)
    structured_data = {}
    if extract.entities_json:
        try:
            structured_data = json.loads(extract.entities_json) if isinstance(extract.entities_json, str) else extract.entities_json
        except (json.JSONDecodeError, TypeError):
            structured_data = {}

    if extract.medical_analysis_json:
        try:
            medical = json.loads(extract.medical_analysis_json) if isinstance(extract.medical_analysis_json, str) else extract.medical_analysis_json
        except (json.JSONDecodeError, TypeError):
            medical = {"explanation": extract.summary_text or "", "confidence": "medium"}
    else:
        # Use Groq API to generate explanation
        from app.services.llm_service import medical_llm_response
        system_prompt = "You are a medical report analyst explaining results to patients. Use simple language and explain all medical terms. Structure your response clearly with sections and bullet points. Make it easy to understand for non-medical people."
        user_prompt = f"Analyze this medical report and explain it in simple terms:\n\n{extract.summary_text}\n\nExplain what each medical term means and what the results indicate for the patient's health. Use clear sections and bullet points."
        
        explanation = await medical_llm_response([{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}])
        medical = {"explanation": explanation, "confidence": "high"}
        crud.update_report_analysis(db, report_id, medical)

    explanation = f"{medical.get('explanation', '')}"
    if medical.get('confidence'):
        explanation += f"\n\nConfidence: {medical['confidence']}"
    
    return {
        "explanation": explanation + medical_disclaimer(),
        "confidence": medical.get("confidence", "medium"),
        "structured_data": structured_data,
        "findings": medical.get("findings", []),
    }



@router.get("/{report_id}/lab-values")
def get_report_lab_values(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    from app.db.models_lab_values import LabValue
    lab_values = db.query(LabValue).filter(
        LabValue.report_id == report_id
    ).order_by(LabValue.test_name).all()
    
    results = []
    for lab in lab_values:
        results.append({
            "test_name": lab.test_name,
            "value": lab.value,
            "unit": lab.unit,
            "status": lab.status,
            "severity": lab.severity,
            "normal_range": {
                "min": lab.normal_range_min,
                "max": lab.normal_range_max
            } if lab.normal_range_min and lab.normal_range_max else None,
            "interpretation": lab.interpretation,
            "confidence": lab.extraction_confidence
        })
    
    return {
        "report_id": report_id,
        "lab_values": results,
        "total_count": len(results)
    }

@router.get("/{report_id}/download")
def get_report_download_url(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.db.models_reports import Report
    from app.services.s3_service import get_presigned_url
    
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not report.s3_key:
        raise HTTPException(status_code=404, detail="File not available for download")
    
    url = get_presigned_url(report.s3_key, expiry=3600)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")
    
    return {"download_url": url, "expires_in": 3600}

@router.post("/compare")
async def compare_reports(
    report_id_1: int = Form(...),
    report_id_2: int = Form(...),
    language: str = Form("english"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.db.models_reports import Report
    from app.services.report_comparison_service import compare_reports as compare_service
    
    # Verify both reports belong to user
    report1 = db.query(Report).filter(
        Report.id == report_id_1,
        Report.user_id == current_user.id
    ).first()
    report2 = db.query(Report).filter(
        Report.id == report_id_2,
        Report.user_id == current_user.id
    ).first()
    
    if not report1 or not report2:
        raise HTTPException(status_code=404, detail="One or both reports not found")
    
    # Get extracts
    extract1 = crud.get_report_extract(db, report_id_1)
    extract2 = crud.get_report_extract(db, report_id_2)
    
    if not extract1 or not extract2:
        raise HTTPException(status_code=404, detail="Report analysis not found")
    
    # Compare
    result = await compare_service(
        old_report_summary=extract1.summary_text or "",
        new_report_summary=extract2.summary_text or "",
        report_type=report1.report_type or "medical report",
        language=language
    )
    
    return result

@router.get("/same-type/{report_type}")
def get_reports_by_type(report_type: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.db.models_reports import Report
    
    reports = db.query(Report).filter(
        Report.user_id == current_user.id,
        Report.report_type == report_type
    ).order_by(Report.created_at.desc()).all()
    
    result = []
    for report in reports:
        extract = crud.get_report_extract(db, report.id)
        result.append({
            "id": report.id,
            "filename": report.filename,
            "report_type": report.report_type,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "summary_text": extract.summary_text if extract else None,
        })
    
    return {"reports": result, "count": len(result)}
