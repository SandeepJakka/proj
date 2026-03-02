# Phase 3 Migration - Quick Start

## ⚡ Run This Now

```bash
cd backend
python scripts/migrate_phase3.py
```

That's it! This adds all missing columns to your database.

## ✅ What It Does

Adds these columns:
- `users.username` - For profile sharing
- `users.profile_public` - Public profile toggle
- `users.public_fields` - Which fields to share
- `reports.s3_key` - S3 file storage key
- `reports.report_type` - blood_test, xray, etc.

Plus performance indexes.

## 🚀 Then Start Server

```bash
python -m uvicorn app.main:app --reload
```

Login will now work!

## 📋 New Tables (Auto-Created)

These are created automatically on startup:
- `medicine_reminders`
- `health_plans`

No action needed for these.

## ❓ If Migration Fails

See `MIGRATION_INSTRUCTIONS.md` for manual SQL commands.

## ✅ Verify

After migration, test:
1. Login - should work without errors
2. Upload report - should save s3_key and report_type
3. Update profile - should allow username setting

Done! 🎉
