-- Add standard base properties to onboarding_progress table
-- Migration: 20251219091034_add_audit_fields_to_onboarding_progress.sql
--
-- Adds standard audit/tracking fields used across all tables:
-- - created_by: User who created the record
-- - updated_by: User who last updated the record
-- - deleted_at: Timestamp for soft deletes (NULL = not deleted)

-- Add created_by column
ALTER TABLE onboarding_progress
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add updated_by column
ALTER TABLE onboarding_progress
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add deleted_at column for soft deletes
ALTER TABLE onboarding_progress
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add comments
COMMENT ON COLUMN onboarding_progress.created_by IS 'User who created this onboarding progress record';
COMMENT ON COLUMN onboarding_progress.updated_by IS 'User who last updated this onboarding progress record';
COMMENT ON COLUMN onboarding_progress.deleted_at IS 'Timestamp when record was soft deleted (NULL if not deleted)';

-- Backfill existing records: set created_by and updated_by to user_id
UPDATE onboarding_progress
SET
  created_by = user_id,
  updated_by = user_id
WHERE created_by IS NULL OR updated_by IS NULL;
