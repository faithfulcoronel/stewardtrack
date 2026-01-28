-- =============================================================================
-- Migration: Fix Admin Users Count Logic
-- =============================================================================
-- Description: Changes admin_users counting to count ALL users under the tenant
--              (from tenant_users table) instead of checking specific role codes.
-- Date: 2026-01-28
-- Author: Claude Code
-- =============================================================================

BEGIN;

-- =============================================================================
-- Step 1: Drop the old trigger on user_roles
-- =============================================================================
DROP TRIGGER IF EXISTS admin_user_count_trigger ON user_roles;
DROP FUNCTION IF EXISTS trigger_update_admin_user_count();

-- =============================================================================
-- Step 2: Create new trigger function for tenant_users table
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_update_user_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New user added to tenant
    PERFORM increment_usage(NEW.tenant_id, 'admin_users', 1);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- User removed from tenant
    PERFORM increment_usage(OLD.tenant_id, 'admin_users', -1);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Step 3: Create trigger on tenant_users table
-- =============================================================================
DROP TRIGGER IF EXISTS user_count_trigger ON tenant_users;
CREATE TRIGGER user_count_trigger
  AFTER INSERT OR DELETE
  ON tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_count();

-- =============================================================================
-- Step 4: Update sync_tenant_usage_counts function
-- =============================================================================
CREATE OR REPLACE FUNCTION sync_tenant_usage_counts(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_count INTEGER;
  v_user_count INTEGER;
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

  -- Count ALL users under the tenant (from tenant_users)
  SELECT COUNT(*)::INTEGER INTO v_user_count
  FROM tenant_users
  WHERE tenant_id = p_tenant_id;

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
    current_admin_users = COALESCE(v_user_count, 0),
    current_storage_bytes = COALESCE(v_storage_bytes, 0)
  WHERE tenant_id = p_tenant_id;
END;
$$;

-- =============================================================================
-- Step 5: Re-sync all tenant usage counts with new logic
-- =============================================================================
DO $$
DECLARE
  v_tenant RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_tenant IN SELECT id FROM tenants WHERE deleted_at IS NULL LOOP
    PERFORM sync_tenant_usage_counts(v_tenant.id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Re-synced usage counts for % tenants with new user counting logic', v_count;
END $$;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated admin_users to count all tenant users';
END $$;

COMMIT;
