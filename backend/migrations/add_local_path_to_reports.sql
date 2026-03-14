-- Migration: Add local_path column to reports table
-- Date: 2024
-- Description: Adds local file system path for report file viewing

ALTER TABLE reports ADD COLUMN IF NOT EXISTS local_path VARCHAR;

-- Add comment to column
COMMENT ON COLUMN reports.local_path IS 'Local file system path for viewing uploaded reports';
