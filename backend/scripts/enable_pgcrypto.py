import psycopg2
from app.config import settings

conn = psycopg2.connect(settings.DATABASE_URL)
cur = conn.cursor()
cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
conn.commit()
cur.close()
conn.close()
print("pgcrypto enabled successfully")
