import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../"))

from app.db.database import engine

def add_column():
    print("Attempting to add 'medical_analysis_json' column to 'report_extracts' table...")
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE report_extracts ADD COLUMN medical_analysis_json TEXT;"))
            conn.commit()
        print("✅ Successfully added column.")
    except Exception as e:
        print(f"❌ Failed (column might already exist or other error): {e}")

if __name__ == "__main__":
    add_column()
