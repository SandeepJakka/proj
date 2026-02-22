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
from app.services.analytics_service import analyze_health_trends
from app.safety.disclaimers import medical_disclaimer

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/")
def get_reports(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_user_reports(db, current_user.id)

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from app.db.models_lab_values import LabValue
    from app.db.models_reports import Report, ReportExtract
    
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.query(LabValue).filter(LabValue.report_id == report_id).delete()
    db.query(ReportExtract).filter(ReportExtract.report_id == report_id).delete()
    db.query(Report).filter(Report.id == report_id).delete()
    db.commit()
    
    return {"message": "Report deleted"}

@router.get("/analytics/trends")
async def get_health_trends(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return await analyze_health_trends(db, current_user.id)

@router.post("/upload")
async def upload_report(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Upload and analyze medical report or medical image (X-ray, CT, MRI).
    
    For text reports (PDF):
    1. Extract text (OCR)
    2. Parse lab values
    3. Generate summary
    
    For medical images (X-ray, CT, MRI):
    1. Analyze image using vision AI
    2. Extract findings
    3. Provide interpretation
    """
    # Step 1: File handling
    path, ext = save_upload(file)
    
    # Detect if this is a medical image (X-ray, CT, MRI)
    image_keywords = ['xray', 'x-ray', 'ct', 'mri', 'scan', 'radiograph']
    is_medical_image = any(keyword in file.filename.lower() for keyword in image_keywords)
    
    # Step 2: Save basic report
    report = crud.create_report(db, file.filename, ext, user_id=current_user.id)
    
    # Step 3: Route to appropriate analysis
    if is_medical_image and ext in ["png", "jpg", "jpeg"]:
        # Medical image analysis (X-ray, CT, MRI)
        from app.services.vision_service import analyze_medical_image
        
        # Determine image type from filename
        image_type = "X-ray"
        if 'ct' in file.filename.lower():
            image_type = "CT scan"
        elif 'mri' in file.filename.lower():
            image_type = "MRI"
        
        vision_result = await analyze_medical_image(path, image_type)
        
        if vision_result["success"]:
            # Store vision analysis as report extract
            entities = {"image_type": image_type, "confidence": vision_result["confidence"]}
            try:
                crud.create_report_extract(
                    db,
                    report.id,
                    f"Medical Image Analysis: {image_type}",
                    entities,
                    vision_result["analysis"]
                )
                db.commit()
            except Exception as e:
                print(f"Failed to save report extract: {e}")
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to save analysis")
            
            return {
                "report_id": report.id,
                "type": "medical_image",
                "image_type": image_type,
                "analysis": vision_result["analysis"],
                "confidence": vision_result["confidence"],
                "disclaimer": vision_result["disclaimer"]
            }
        else:
            # Delete the report if analysis failed
            db.query(models.Report).filter(models.Report.id == report.id).delete()
            db.commit()
            raise HTTPException(status_code=500, detail=vision_result.get("error", "Vision analysis failed"))
    
    else:
        # Text-based report analysis (existing flow)
        raw_text = extract_text(path, ext)
        
        from app.services.enhanced_report_analyzer import analyze_and_store_report
        from app.db.crud import get_health_profile
        
        profile = get_health_profile(db, current_user.id)
        user_gender = profile.gender if profile else None
        user_age = profile.age if profile else None
        
        try:
            analysis = analyze_and_store_report(
                db=db,
                report_id=report.id,
                user_id=current_user.id,
                raw_text=raw_text,
                user_gender=user_gender,
                user_age=user_age
            )
            
            crud.create_report_extract(
                db, 
                report.id, 
                raw_text, 
                analysis["entities"], 
                analysis["clinical_summary"]
            )
            
            return {
                "report_id": report.id,
                "type": "lab_report",
                "lab_values_found": len(analysis["lab_values"]),
                "risk_flags": analysis["risk_flags"],
                "summary": analysis["clinical_summary"]
            }
            
        except Exception as e:
            print(f"Enhanced analysis failed: {e}. Falling back to basic extraction.")
            entities = extract_entities(raw_text)
            summary = build_report_summary(raw_text, entities)
            crud.create_report_extract(db, report.id, raw_text, entities, summary)
            
            return {
                "report_id": report.id,
                "type": "lab_report",
                "lab_values_found": 0,
                "note": "Basic extraction used - enhanced analysis unavailable"
            }

@router.post("/{report_id}/explain")
async def explain_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    report = db.query(models.Report).filter(models.Report.id == report_id, models.Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    extract = crud.get_report_extract(db, report_id)
    
    if not extract:
        raise HTTPException(status_code=404, detail="Report extract not found. Please re-upload the report.")

    if extract.medical_analysis_json:
        medical = json.loads(extract.medical_analysis_json)
    else:
        # Use Groq API for faster response
        from app.services.llm_service import medical_llm_response
        
        system_prompt = "You are a medical report analyst explaining results to patients. Use simple language and explain all medical terms. Structure your response clearly with sections and bullet points. Make it easy to understand for non-medical people."
        user_prompt = f"Analyze this medical report and explain it in simple terms:\n\n{extract.summary_text}\n\nExplain what each medical term means and what the results indicate for the patient's health. Use clear sections and bullet points."
        
        explanation = await medical_llm_response([{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}])
        
        medical = {"explanation": explanation, "confidence": "high"}
        crud.update_report_analysis(db, report_id, medical)

    explanation = f"{medical['explanation']}"
    if 'confidence' in medical:
        explanation += f"\n\nConfidence: {medical['confidence']}"
    
    return {"explanation": explanation + medical_disclaimer()}


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

