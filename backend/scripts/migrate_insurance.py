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
            CREATE TABLE IF NOT EXISTS insurance_policies (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                policy_name VARCHAR NOT NULL,
                insurer_name VARCHAR,
                policy_type VARCHAR,
                policy_number VARCHAR,
                policy_text TEXT NOT NULL,
                page_count INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_insurance_user_id
            ON insurance_policies(user_id)
        """))
        conn.commit()
        logger.info("✅ insurance_policies table created")


if __name__ == "__main__":
    migrate()
