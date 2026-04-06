import psycopg2
from app.config import settings

url = settings.DATABASE_URL
try:
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    print("Adding 'doc_id' column to 'reports' table...")
    cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS doc_id VARCHAR")
    
    # Also ensure report_extracts has medical_analysis_json (looks like it does, but good to be safe)
    cur.execute("ALTER TABLE report_extracts ADD COLUMN IF NOT EXISTS medical_analysis_json TEXT")
    
    conn.commit()
    print("Schema update completed successfully!")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error during schema update: {e}")
