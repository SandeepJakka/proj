import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../"))

from app.db.database import engine

def fix_users():
    print("Fixing Users table...")
    try:
        with engine.connect() as conn:
            # 1. Delete conflicting user
            print("Deleting user with email 'dev@healthora.com'...")
            conn.execute(text("DELETE FROM users WHERE email = 'dev@healthora.com'"))
            
            # 2. Insert User 1
            print("Inserting User 1...")
            # We use ON CONFLICT just in case ID 1 exists with different email
            conn.execute(text("INSERT INTO users (id, email) VALUES (1, 'dev@healthora.com') ON CONFLICT (id) DO UPDATE SET email='dev@healthora.com'"))
            
            # 3. Reset sequence to avoid future collisions
            conn.execute(text("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))"))
            
            conn.commit()
            print("✅ Users fixed. User 1 is now 'dev@healthora.com'.")
            
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    fix_users()
