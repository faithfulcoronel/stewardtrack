-- =============================================================================
-- Migration: Add Tenant Setup Tracking
-- =============================================================================
-- Description: Adds columns to track registration/setup completion status.
-- This allows the system to detect incomplete registrations and auto-recover
-- by re-running the setup process on first admin page load.
--
-- Columns added:
-- - setup_completed_at: Timestamp when async setup tasks completed successfully
-- - setup_status: Current status of the setup process
-- - setup_error: Last error message if setup failed
-- =============================================================================

BEGIN;

-- Add setup tracking columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS setup_status TEXT DEFAULT 'pending'
  CHECK (setup_status IN ('pending', 'in_progress', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS setup_error TEXT DEFAULT NULL;

-- Add index for querying incomplete setups
CREATE INDEX IF NOT EXISTS idx_tenants_setup_status
ON tenants(setup_status)
WHERE setup_status != 'completed';

-- Update existing tenants: Mark them as completed since they're already operational
-- Only update tenants that don't have a setup_status yet (new column default is 'pending')
UPDATE tenants
SET
  setup_status = 'completed',
  setup_completed_at = COALESCE(updated_at, created_at)
WHERE setup_completed_at IS NULL
  AND created_at < NOW() - INTERVAL '1 hour';

-- Add comment for documentation
COMMENT ON COLUMN tenants.setup_completed_at IS
  'Timestamp when the async registration setup tasks completed successfully';
COMMENT ON COLUMN tenants.setup_status IS
  'Current status of the registration setup process: pending, in_progress, completed, failed';
COMMENT ON COLUMN tenants.setup_error IS
  'Last error message if the setup process failed';

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Tenant setup tracking columns added successfully';
END $$;

COMMIT;
