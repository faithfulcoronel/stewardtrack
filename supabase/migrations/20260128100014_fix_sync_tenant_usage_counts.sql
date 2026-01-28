-- =============================================================================
-- Migration: Fix sync_tenant_usage_counts Function
-- =============================================================================
-- Description: Patches the sync_tenant_usage_counts function to count all
--              members (regardless of status) and remove reference to
--              non-existent columns.
-- Date: 2026-01-28
-- Author: Claude Code
-- =============================================================================

BEGIN;

-- Update sync_tenant_usage_counts to count all members (not just active)
CREATE OR REPLACE FUNCTION sync_tenant_usage_counts(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_count INTEGER;
  v_admin_count INTEGER;
  v_storage_bytes BIGINT;
BEGIN
  -- Ensure tenant has a usage record
  INSERT INTO tenant_usage (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Count ALL members for tenant (regardless of status)
  SELECT COUNT(*)::INTEGER INTO v_member_count
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  -- Count admin users (users with admin roles)
  -- Note: user_roles uses hard deletes, not soft deletes
  SELECT COUNT(DISTINCT ur.user_id)::INTEGER INTO v_admin_count
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.tenant_id = p_tenant_id
    AND r.code IN ('tenant_admin', 'staff', 'admin');

  -- Calculate storage from media/files (if table exists)
  BEGIN
    SELECT COALESCE(SUM(file_size), 0)::BIGINT INTO v_storage_bytes
    FROM media
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL;
  EXCEPTION WHEN undefined_table THEN
    v_storage_bytes := 0;
  END;

  -- Update usage record
  UPDATE tenant_usage
  SET
    current_members = COALESCE(v_member_count, 0),
    current_admin_users = COALESCE(v_admin_count, 0),
    current_storage_bytes = COALESCE(v_storage_bytes, 0)
  WHERE tenant_id = p_tenant_id;
END;
$$;

-- =============================================================================
-- Initialize usage counts for existing tenants (now that function is fixed)
-- =============================================================================
DO $$
DECLARE
  v_tenant RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_tenant IN SELECT id FROM tenants WHERE deleted_at IS NULL LOOP
    -- Sync counts from source tables using the patched function
    PERFORM sync_tenant_usage_counts(v_tenant.id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Initialized usage counts for % tenants', v_count;
END $$;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Successfully patched sync_tenant_usage_counts function and initialized tenant counts';
END $$;

COMMIT;
