# Phase 3 Database Migration Instructions

## Problem
Phase 3 added new columns to existing tables (`users` and `reports`), but SQLAlchemy's `create_all()` only creates new tables—it doesn't alter existing ones.

## Solution
Run the migration script to add the missing columns.

## Steps to Run Migration

### Option 1: Run Migration Script (Recommended)

```bash
cd backend
python scripts/migrate_phase3.py
```

Expected output:
```
INFO:__main__:Starting Phase 3 database migrations...
INFO:__main__:✅ ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE...
INFO:__main__:✅ ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_public BOOLEAN...
INFO:__main__:✅ ALTER TABLE users ADD COLUMN IF NOT EXISTS public_fields TEXT...
INFO:__main__:✅ ALTER TABLE reports ADD COLUMN IF NOT EXISTS s3_key VARCHAR...
INFO:__main__:✅ ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type VARCHAR...
INFO:__main__:✅ CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)...
INFO:__main__:✅ CREATE INDEX IF NOT EXISTS ix_reports_report_type ON reports(re...
INFO:__main__:✅ CREATE INDEX IF NOT EXISTS ix_reports_user_id_type ON reports(u...
INFO:__main__:✅ All Phase 3 migrations completed successfully!
```

### Option 2: Manual SQL (if script fails)

Connect to PostgreSQL and run:

```sql
-- Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_fields TEXT;

-- Reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS s3_key VARCHAR;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type VARCHAR;

-- Indexes
CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS ix_reports_user_id_type ON reports(user_id, report_type);
```

### Option 3: Python Console

```python
from sqlalchemy import text
from app.db.database import engine

migrations = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS public_fields TEXT",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS s3_key VARCHAR",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type VARCHAR",
    "CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)",
    "CREATE INDEX IF NOT EXISTS ix_reports_report_type ON reports(report_type)",
    "CREATE INDEX IF NOT EXISTS ix_reports_user_id_type ON reports(user_id, report_type)",
]

with engine.connect() as conn:
    for m in migrations:
        conn.execute(text(m))
    conn.commit()
print("✅ Migrations complete!")
```

## Verify Migration

After running the migration, verify the columns exist:

```sql
-- Check users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('username', 'profile_public', 'public_fields');

-- Check reports table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND column_name IN ('s3_key', 'report_type');
```

Expected output:
```
     column_name     |     data_type
---------------------+-------------------
 username            | character varying
 profile_public      | boolean
 public_fields       | text
 s3_key              | character varying
 report_type         | character varying
```

## Start the Server

After migration completes:

```bash
python -m uvicorn app.main:app --reload
```

Login should now work without errors.

## New Tables Auto-Created

These tables are automatically created on startup (no migration needed):
- `medicine_reminders`
- `health_plans`

## Troubleshooting

**Error: "relation 'users' does not exist"**
- Run the main app first to create base tables
- Then run the migration script

**Error: "column already exists"**
- Safe to ignore - the script uses IF NOT EXISTS
- Migration is idempotent (can run multiple times)

**Error: "permission denied"**
- Ensure your database user has ALTER TABLE privileges
- Connect as superuser or table owner

## Rollback (if needed)

To remove Phase 3 columns:

```sql
ALTER TABLE users DROP COLUMN IF EXISTS username;
ALTER TABLE users DROP COLUMN IF EXISTS profile_public;
ALTER TABLE users DROP COLUMN IF EXISTS public_fields;
ALTER TABLE reports DROP COLUMN IF EXISTS s3_key;
ALTER TABLE reports DROP COLUMN IF EXISTS report_type;
DROP INDEX IF EXISTS ix_users_username;
DROP INDEX IF EXISTS ix_reports_report_type;
DROP INDEX IF EXISTS ix_reports_user_id_type;
```

## Future Migrations

For production, consider using Alembic for proper migration management:

```bash
pip install alembic
alembic init alembic
alembic revision --autogenerate -m "Phase 3 columns"
alembic upgrade head
```
