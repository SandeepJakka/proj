import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../"))

from app.db.database import engine

def migrate():
    print("🚀 Starting Phase 0 Database Migration...")
    
    # List of tables and columns to add
    migrations = [
        # Table, Column, Type
        ("report_extracts", "medical_analysis_json", "TEXT"),
        ("users", "is_verified", "BOOLEAN DEFAULT FALSE"),
        ("users", "is_active", "BOOLEAN DEFAULT TRUE"),
        ("users", "full_name", "VARCHAR"),
        ("users", "otp_code", "VARCHAR"),
        ("users", "otp_expires_at", "TIMESTAMP"),
        ("users", "refresh_token", "VARCHAR")
    ]

    with engine.connect() as conn:
        for table, column, col_type in migrations:
            print(f"Checking column '{column}' in table '{table}'...")
            try:
                # PostgreSQL specific: ADD COLUMN IF NOT EXISTS
                query = text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type};")
                conn.execute(query)
                conn.commit()
                print(f"  ✅ Column '{column}' processed.")
            except Exception as e:
                print(f"  ❌ Failed to process '{column}': {e}")
                conn.rollback()

    print("\n✅ Migration check complete.")

if __name__ == "__main__":
    migrate()
