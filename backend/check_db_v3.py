import psycopg2
from app.config import settings

url = settings.DATABASE_URL
try:
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM reports")
    total = cur.fetchone()[0]
    print(f"Total Reports: {total}")
    
    cur.execute("SELECT COUNT(*) FROM reports WHERE user_id IS NULL")
    unassigned = cur.fetchone()[0]
    print(f"Unassigned Reports: {unassigned}")
    
    cur.execute("SELECT id, email FROM users")
    users = cur.fetchall()
    print(f"Total Users: {len(users)}")
    for uid, email in users:
        cur.execute("SELECT COUNT(*) FROM reports WHERE user_id = %s", (uid,))
        count = cur.fetchone()[0]
        print(f"User {uid} ({email}): {count} reports")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
