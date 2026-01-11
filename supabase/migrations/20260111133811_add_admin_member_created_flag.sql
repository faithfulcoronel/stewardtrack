-- =============================================================================
-- Migration: Add Admin Member Created Flag
-- =============================================================================
-- Description: Adds a column to track whether the tenant admin's member profile
-- has been created. This helps prevent duplicate member creation attempts and
-- provides better visibility into the registration/setup process.
--
-- Column added:
-- - admin_member_created: Boolean flag indicating if admin member profile exists
-- =============================================================================

BEGIN;

-- Add admin_member_created column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS admin_member_created BOOLEAN DEFAULT FALSE;

-- Update existing tenants: Check if they have a member linked to the tenant creator
UPDATE tenants t
SET admin_member_created = TRUE
WHERE EXISTS (
  SELECT 1 FROM members m
  WHERE m.tenant_id = t.id
    AND m.user_id = t.created_by
    AND m.deleted_at IS NULL
);

-- Add comment for documentation
COMMENT ON COLUMN tenants.admin_member_created IS
  'Flag indicating if the tenant admin (creator) has a linked member profile';

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Admin member created flag added to tenants table';
END $$;

COMMIT;
