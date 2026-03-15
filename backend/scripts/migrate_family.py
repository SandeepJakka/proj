import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS family_members (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name VARCHAR NOT NULL,
                relation VARCHAR NOT NULL,
                age INTEGER,
                gender VARCHAR,
                blood_type VARCHAR,
                known_conditions TEXT,
                allergies TEXT,
                weight_kg FLOAT,
                height_cm FLOAT,
                notes TEXT,
                avatar_color VARCHAR DEFAULT '#2563EB',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS family_member_reports (
                id SERIAL PRIMARY KEY,
                member_id INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id),
                filename VARCHAR NOT NULL,
                file_type VARCHAR,
                local_path VARCHAR,
                summary_text TEXT,
                report_type VARCHAR,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_family_members_user_id
            ON family_members(user_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_family_reports_member_id
            ON family_member_reports(member_id)
        """))
        conn.commit()
        logger.info("✅ Family vault tables created")


if __name__ == "__main__":
    migrate()
