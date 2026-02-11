from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.db.deps import get_db, get_current_user
from app.db import crud, models
from app.utils.file_handler import save_upload
from app.services.ocr_service import extract_text
from app.services.ner_service import extract_entities
from app.services.report_summary_service import build_report_summary
from app.services.medical_reasoning_service import run_medical_reasoning
from app.services.llm_service import simplify_medical_text
from app.services.analytics_service import analyze_health_trends
from app.safety.disclaimers import medical_disclaimer

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/")
def get_reports(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_user_reports(db, current_user.id)

@router.get("/analytics/trends")
async def get_health_trends(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return await analyze_health_trends(db, current_user.id)

@router.post("/upload")
async def upload_report(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Upload and analyze medical report with structured lab value extraction.
    
    Flow:
    1. Save file and extract text (OCR)
    2. Parse numeric lab values (deterministic)
    3. Benchmark against clinical ranges (deterministic)
    4. Extract entities (NER)
    5. Generate summary
    6. Save everything to database
    """
    # Step 1: File handling and OCR
    path, ext = save_upload(file)
    raw_text = extract_text(path, ext)
    
    # Step 2: Save basic report
    report = crud.create_report(db, file.filename, ext, user_id=current_user.id)
    
    # Step 3: Enhanced analysis with deterministic lab parsing
    from app.services.enhanced_report_analyzer import analyze_and_store_report
    from app.db.crud import get_health_profile
    
    # Get user demographics for reference ranges
    profile = get_health_profile(db, current_user.id)
    user_gender = profile.gender if profile else None
    user_age = profile.age if profile else None
    
    try:
        # Run comprehensive analysis
        analysis = analyze_and_store_report(
            db=db,
            report_id=report.id,
            user_id=current_user.id,
            raw_text=raw_text,
            user_gender=user_gender,
            user_age=user_age
        )
        
        # Save traditional extraction for backward compatibility
        crud.create_report_extract(
            db, 
            report.id, 
            raw_text, 
            analysis["entities"], 
            analysis["clinical_summary"]
        )
        
        return {
            "report_id": report.id,
            "lab_values_found": len(analysis["lab_values"]),
            "risk_flags": analysis["risk_flags"],
            "summary": analysis["clinical_summary"]
        }
        
    except Exception as e:
        # Fallback to basic extraction if enhanced analysis fails
        print(f"Enhanced analysis failed: {e}. Falling back to basic extraction.")
        entities = extract_entities(raw_text)
        summary = build_report_summary(raw_text, entities)
        crud.create_report_extract(db, report.id, raw_text, entities, summary)
        
        return {
            "report_id": report.id,
            "lab_values_found": 0,
            "note": "Basic extraction used - enhanced analysis unavailable"
        }

@router.post("/{report_id}/explain")
async def explain_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Security check: Ensure report belongs to user
    report = db.query(models.Report).filter(models.Report.id == report_id, models.Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    extract = crud.get_report_extract(db, report_id)

    # Check Cache
    if extract.medical_analysis_json:
        medical = json.loads(extract.medical_analysis_json)
        print(f"Start-up Cache HIT for Report {report_id}")
    else:
        print(f"Cache MISS for Report {report_id} - Running Inference")
        medical = await run_medical_reasoning(
            symptoms=[],
            report_summary=extract.summary_text,
            db=db,
            user_id=current_user.id
        )
        # Save to Cache
        crud.update_report_analysis(db, report_id, medical)

    simplified = await simplify_medical_text(
        f"{medical['explanation']}\nConfidence: {medical['confidence']}"
    )

    return {"explanation": simplified + medical_disclaimer()}


@router.get("/{report_id}/lab-values")
def get_report_lab_values(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Get structured lab values for a specific report with clinical benchmarking.
    
    Returns lab values with:
    - Test name, value, unit
    - Clinical status (normal/low/high/critical)
    - Severity assessment
    - Reference ranges
    - Interpretation
    """
    # Security check
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Fetch lab values from database
    from app.db.models_lab_values import LabValue
    
    lab_values = db.query(LabValue).filter(
        LabValue.report_id == report_id
    ).order_by(LabValue.test_name).all()
    
    # Format response
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

