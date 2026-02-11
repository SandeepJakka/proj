import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def inspect_users():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("SELECT id, email, hashed_password FROM users")
        rows = cur.fetchall()
        
        print(f"Total users found: {len(rows)}")
        for row in rows:
            print(f"ID: {row[0]}, Email: {row[1]}, Hash exists: {row[2] is not None}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Inspection failed: {e}")

if __name__ == "__main__":
    inspect_users()
