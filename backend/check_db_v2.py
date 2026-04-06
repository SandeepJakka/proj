from app.db.database import SessionLocal
from app.db.models_reports import Report
from app.db import models

db = SessionLocal()
try:
    total_reports = db.query(Report).count()
    print(f"Total Reports in DB: {total_reports}")
    
    unassigned_reports = db.query(Report).filter(Report.user_id == None).all()
    print(f"Reports with NO user_id: {len(unassigned_reports)}")
    
    users = db.query(models.User).all()
    print(f"Total Users: {len(users)}")
    for u in users:
        reports = db.query(Report).filter(Report.user_id == u.id).all()
        print(f"User {u.id} ({u.email}): {len(reports)} reports")
    
finally:
    db.close()
