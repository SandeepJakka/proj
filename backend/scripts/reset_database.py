import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def reset_users():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("Wiping user data for fresh start...")
        # Since other tables have FKs, we might need a CASCADE or delete children first
        cur.execute("DELETE FROM chat_messages")
        cur.execute("DELETE FROM report_extracts")
        cur.execute("DELETE FROM reports")
        cur.execute("DELETE FROM health_profiles")
        cur.execute("DELETE FROM users")
        
        conn.commit()
        print("Success! Database cleared. You can now register a fresh account.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Reset failed: {e}")

if __name__ == "__main__":
    reset_users()
