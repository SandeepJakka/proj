import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Add hashed_password to users if not exists
        print("Checking users table...")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR")
        
        # Add user_id to reports if not exists
        print("Checking reports table...")
        cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id INTEGER")
        
        conn.commit()
        print("Migration successful!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
