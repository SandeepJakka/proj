"""
Migration script to add lab_values table for structured clinical data.

Run this to enable deterministic benchmarking and trend analysis.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def migrate():
    """Add lab_values table to database"""
    
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    try:
        print("\nCreating lab_values table...")
        
        # Create lab_values table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS lab_values (
                id SERIAL PRIMARY KEY,
                report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                
                test_name VARCHAR NOT NULL,
                value DOUBLE PRECISION NOT NULL,
                unit VARCHAR NOT NULL,
                
                normal_range_min DOUBLE PRECISION,
                normal_range_max DOUBLE PRECISION,
                
                status VARCHAR,
                severity VARCHAR,
                delta DOUBLE PRECISION,
                
                interpretation TEXT,
                extraction_confidence DOUBLE PRECISION DEFAULT 0.0,
                raw_text TEXT,
                
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                evaluation_details JSONB
            );
        """)
        
        # Create indices for performance
        print("Creating indices...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_lab_values_report_id ON lab_values(report_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_lab_values_user_id ON lab_values(user_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_lab_values_test_name ON lab_values(test_name);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_lab_values_created_at ON lab_values(created_at);
        """)
        
        conn.commit()
        print("\n✅ Migration successful!")
        print("\nNew capabilities enabled:")
        print("  - Deterministic lab value extraction")
        print("  - Clinical benchmarking against reference ranges")
        print("  - Mathematical trend analysis")
        print("  - Structured longitudinal tracking")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
