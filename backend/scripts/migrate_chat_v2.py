"""
Migration: Add user_id to chat_messages and create chat_sessions table
Run this after starting the FastAPI server (it will auto-create tables)
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.database import engine, Base
from app.db.models_chat import ChatSession, ChatMessage
from sqlalchemy import text

def migrate():
    print("🔄 Creating chat persistence tables...")
    
    # This will create all tables defined in Base
    Base.metadata.create_all(bind=engine)
    
    # Add user_id column if it doesn't exist (for existing chat_messages)
    with engine.connect() as conn:
        try:
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
        except Exception as e:
            print(f"Note: {e}")
            print("Tables will be created on next server start.")

if __name__ == "__main__":
    migrate()
