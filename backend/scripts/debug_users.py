import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../"))

from app.db.database import engine

def debug_users():
    print("Querying Users table...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, email FROM users"))
            rows = result.fetchall()
            if not rows:
                print("No users found.")
            for row in rows:
                print(f"User: ID={row[0]}, Email={row[1]}")
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    debug_users()
