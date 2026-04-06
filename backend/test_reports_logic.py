import axios
import json

# We can't easily get a token for a user without password, 
# but we can check the database directly again to be sure.

from app.db.database import SessionLocal
from app.db.models_reports import Report
from app.api import reports # to check the logic

db = SessionLocal()
try:
    # Check user 12 (who has 5 reports)
    from app.db import crud
    reps = crud.get_user_reports(db, 12)
    print(f"User 12: found {len(reps)} reports via CRUD")
    
    # Check what the API result list looks like
    result = []
    for r in reps:
        extract = crud.get_report_extract(db, r.id)
        result.append({
            "id": r.id,
            "filename": r.filename,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "has_analysis": extract.medical_analysis_json is not None if extract else False,
        })
    print(f"Sample API result item: {result[0] if result else 'None'}")
    
finally:
    db.close()
