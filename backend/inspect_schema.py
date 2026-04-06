import psycopg2
from app.config import settings

url = settings.DATABASE_URL
# parse URL manually to satisfy psycopg2 or use it directly if it's correct
# postgresql://healthora_user:password@localhost:5432/healthora_db
try:
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'reports'")
    cols = cur.fetchall()
    print("Columns in 'reports' table:")
    for c in cols:
        print(f"- {c[0]}")
    
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'report_extracts'")
    cols = cur.fetchall()
    print("\nColumns in 'report_extracts' table:")
    for c in cols:
        print(f"- {c[0]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
