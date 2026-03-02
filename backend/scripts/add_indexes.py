from sqlalchemy import text
from app.db.database import engine

indexes = [
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
    "CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);",
    "CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);",
    "CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(file_type);",
]

with engine.connect() as conn:
    for index in indexes:
        conn.execute(text(index))
        print(f"Created: {index[:60]}...")
    conn.commit()
print("All indexes created successfully")
