"""
Phase 3 Database Migration Script
Adds new columns to existing tables for Phase 3 features.
Safe to run multiple times - uses IF NOT EXISTS.
"""

from sqlalchemy import text
from app.db.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run all Phase 3 database migrations."""
    
    migrations = [
        # Users table - Profile sharing columns
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS public_fields TEXT",
        
        # Reports table - S3 and report type columns
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS s3_key VARCHAR",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type VARCHAR",
        
        # Indexes for performance
        "CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)",
        "CREATE INDEX IF NOT EXISTS ix_reports_report_type ON reports(report_type)",
        "CREATE INDEX IF NOT EXISTS ix_reports_user_id_type ON reports(user_id, report_type)",
    ]
    
    logger.info("Starting Phase 3 database migrations...")
    
    with engine.connect() as conn:
        for migration in migrations:
            try:
                conn.execute(text(migration))
                logger.info(f"✅ {migration[:70]}...")
            except Exception as e:
                logger.error(f"❌ Failed: {migration[:70]}... — {e}")
                raise
        
        conn.commit()
        logger.info("✅ All Phase 3 migrations completed successfully!")

if __name__ == "__main__":
    run_migrations()
