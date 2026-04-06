import sys
import os
sys.path.append(os.getcwd())
from app.db.database import SessionLocal
from app.db import models

db = SessionLocal()
try:
    user = db.query(models.User).first()
    if user:
        print(f"USER_ID_FOUND:{user.id}")
    else:
        print("NO_USER_FOUND")
finally:
    db.close()
