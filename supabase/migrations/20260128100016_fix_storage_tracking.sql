-- =============================================================================
-- Migration: Fix Storage Tracking
-- =============================================================================
-- Description: Updates storage tracking to use the correct table (tenant_media)
--              and column (file_size_bytes) instead of non-existent media table.
-- Date: 2026-01-28
-- Author: Claude Code
-- =============================================================================

BEGIN;

-- =============================================================================
-- Step 1: Update sync_tenant_usage_counts to use tenant_media table
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

  -- Calculate storage from tenant_media table
  SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT INTO v_storage_bytes
  FROM tenant_media
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;

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
-- Step 2: Create trigger function for tenant_media storage tracking
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New file uploaded
    IF NEW.deleted_at IS NULL THEN
      PERFORM increment_usage(NEW.tenant_id, 'storage_bytes', NEW.file_size_bytes);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- File restored or soft-deleted
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      -- Restored from soft delete
      PERFORM increment_usage(NEW.tenant_id, 'storage_bytes', NEW.file_size_bytes);
    ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      -- Soft deleted
      PERFORM increment_usage(OLD.tenant_id, 'storage_bytes', -OLD.file_size_bytes);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Hard delete (only count if wasn't already soft-deleted)
    IF OLD.deleted_at IS NULL THEN
      PERFORM increment_usage(OLD.tenant_id, 'storage_bytes', -OLD.file_size_bytes);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Step 3: Create trigger on tenant_media table
-- =============================================================================
DROP TRIGGER IF EXISTS storage_usage_trigger ON tenant_media;
CREATE TRIGGER storage_usage_trigger
  AFTER INSERT OR UPDATE OF deleted_at OR DELETE
  ON tenant_media
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_storage_usage();

-- =============================================================================
-- Step 4: Re-sync all tenant storage counts with correct table
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

  RAISE NOTICE 'Re-synced storage counts for % tenants using tenant_media table', v_count;
END $$;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated storage tracking to use tenant_media table';
END $$;

COMMIT;
