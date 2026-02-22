"""
Migration: Add user_id to chat_messages and create chat_sessions table
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.db.database import engine

def migrate():
    with engine.connect() as conn:
        print("🔄 Starting chat persistence migration...")
        
        # Create chat_sessions table
        print("Creating chat_sessions table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id),
                title VARCHAR DEFAULT 'New Chat',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id)"))
        
        # Add user_id to chat_messages if not exists
        print("Adding user_id to chat_messages...")
        conn.execute(text("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='chat_messages' AND column_name='user_id'
                ) THEN
                    ALTER TABLE chat_messages ADD COLUMN user_id INTEGER REFERENCES users(id);
                    CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
                END IF;
            END $$;
        """))
        
        conn.commit()
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
