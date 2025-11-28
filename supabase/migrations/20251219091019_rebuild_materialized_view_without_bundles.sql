/**
 * Rebuild Materialized View Without Bundles - RBAC Simplification
 *
 * This migration recreates the tenant_user_effective_permissions materialized view
 * without references to the removed bundle tables (role_bundles, bundle_permissions, permission_bundles).
 *
 * The simplified architecture is now:
 * Users → Roles → Permissions (direct assignment only)
 *
 * Date: 2025-12-19
 * Author: RBAC Simplification Initiative
 */

-- ============================================================================
-- Drop the existing materialized view and related objects
-- ============================================================================

-- Drop triggers first (safely handle case where base tables no longer exist)
DO $$
BEGIN
  -- Drop triggers on existing tables
  DROP TRIGGER IF EXISTS refresh_effective_permissions_user_roles ON user_roles;
  DROP TRIGGER IF EXISTS refresh_effective_permissions_role_permissions ON role_permissions;

  -- These triggers reference deleted tables, so we skip them
  -- DROP TRIGGER IF EXISTS refresh_effective_permissions_role_bundles ON role_bundles;
  -- DROP TRIGGER IF EXISTS refresh_effective_permissions_bundle_permissions ON bundle_permissions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some triggers could not be dropped: %', SQLERRM;
END $$;

-- Drop functions
DROP FUNCTION IF EXISTS trigger_refresh_effective_permissions_safe();
DROP FUNCTION IF EXISTS refresh_tenant_user_effective_permissions_safe();
DROP FUNCTION IF EXISTS refresh_tenant_user_effective_permissions();

-- Drop the materialized view
DROP MATERIALIZED VIEW IF EXISTS tenant_user_effective_permissions CASCADE;

-- ============================================================================
-- Create simplified materialized view (direct permissions only)
-- ============================================================================

CREATE MATERIALIZED VIEW tenant_user_effective_permissions AS
WITH direct_permissions AS (
  -- Direct role-to-permission assignments (simplified - no bundles)
  SELECT DISTINCT
    ur.tenant_id,
    ur.user_id,
    p.id as permission_id,
    p.code as permission_code,
    p.name as permission_name,
    p.module as permission_module,
    r.id as role_id,
    r.name as role_name,
    r.metadata_key as role_metadata_key,
    'direct' as assignment_type
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_permissions rp ON r.id = rp.role_id AND ur.tenant_id = rp.tenant_id
  JOIN permissions p ON rp.permission_id = p.id AND rp.tenant_id = p.tenant_id
  WHERE ur.tenant_id IS NOT NULL
    AND r.tenant_id IS NOT NULL
    AND p.tenant_id IS NOT NULL
)
SELECT
  -- Create a synthetic unique ID using hash of the combination
  md5(
    COALESCE(tenant_id::text, '') || '|' ||
    COALESCE(user_id::text, '') || '|' ||
    COALESCE(permission_id::text, '') || '|' ||
    COALESCE(role_id::text, '') || '|' ||
    assignment_type
  ) as unique_id,
  tenant_id,
  user_id,
  permission_id,
  permission_code,
  permission_name,
  permission_module,
  role_id,
  role_name,
  role_metadata_key,
  assignment_type,
  now() as computed_at
FROM direct_permissions;

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- Unique index required for concurrent refresh
CREATE UNIQUE INDEX tenant_user_effective_permissions_unique_id_idx
ON tenant_user_effective_permissions (unique_id);

-- Composite index for most common lookup pattern
CREATE INDEX tenant_user_effective_permissions_tenant_user_idx
ON tenant_user_effective_permissions (tenant_id, user_id);

-- Permission code index for permission checks
CREATE INDEX tenant_user_effective_permissions_permission_code_idx
ON tenant_user_effective_permissions (permission_code);

-- Role metadata key index for metadata-driven UI
CREATE INDEX tenant_user_effective_permissions_role_metadata_key_idx
ON tenant_user_effective_permissions (role_metadata_key) WHERE role_metadata_key IS NOT NULL;

-- Composite index for the most common query pattern (permission checks)
CREATE INDEX tenant_user_effective_permissions_lookup_idx
ON tenant_user_effective_permissions (tenant_id, user_id, permission_code);

-- ============================================================================
-- Create refresh functions
-- ============================================================================

-- Basic refresh function with concurrent/regular fallback
CREATE OR REPLACE FUNCTION refresh_tenant_user_effective_permissions()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Try concurrent refresh first, fall back to regular refresh if it fails
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_user_effective_permissions;
  EXCEPTION
    WHEN OTHERS THEN
      -- If concurrent refresh fails, do a regular refresh
      -- This might briefly lock the view but ensures data consistency
      REFRESH MATERIALIZED VIEW tenant_user_effective_permissions;
  END;
END;
$$;

-- Safe refresh function with comprehensive error handling and audit logging
CREATE OR REPLACE FUNCTION refresh_tenant_user_effective_permissions_safe()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  refresh_start_time timestamptz;
  refresh_end_time timestamptz;
  error_message text;
  concurrent_success boolean := false;
BEGIN
  refresh_start_time := now();

  BEGIN
    -- First try concurrent refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_user_effective_permissions;
    concurrent_success := true;
    refresh_end_time := now();

    -- Log successful concurrent refresh
    INSERT INTO rbac_audit_log (
      tenant_id,
      table_name,
      operation,
      record_id,
      new_values,
      user_id,
      security_impact,
      notes
    ) VALUES (
      NULL, -- System operation
      'tenant_user_effective_permissions',
      'REFRESH',
      gen_random_uuid(),
      jsonb_build_object(
        'refresh_start', refresh_start_time,
        'refresh_end', refresh_end_time,
        'duration_ms', EXTRACT(epoch FROM (refresh_end_time - refresh_start_time)) * 1000,
        'concurrent', true
      ),
      auth.uid(),
      'low',
      'Materialized view concurrent refresh completed successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;

    -- Try regular refresh as fallback
    BEGIN
      REFRESH MATERIALIZED VIEW tenant_user_effective_permissions;
      refresh_end_time := now();

      -- Log successful regular refresh after concurrent failure
      INSERT INTO rbac_audit_log (
        tenant_id,
        table_name,
        operation,
        record_id,
        new_values,
        user_id,
        security_impact,
        notes
      ) VALUES (
        NULL, -- System operation
        'tenant_user_effective_permissions',
        'REFRESH',
        gen_random_uuid(),
        jsonb_build_object(
          'refresh_start', refresh_start_time,
          'refresh_end', refresh_end_time,
          'duration_ms', EXTRACT(epoch FROM (refresh_end_time - refresh_start_time)) * 1000,
          'concurrent', false,
          'concurrent_error', error_message
        ),
        auth.uid(),
        'medium',
        'Materialized view regular refresh completed after concurrent refresh failed: ' || error_message
      );

    EXCEPTION WHEN OTHERS THEN
      refresh_end_time := now();
      error_message := SQLERRM;

      -- Log complete failure
      INSERT INTO rbac_audit_log (
        tenant_id,
        table_name,
        operation,
        record_id,
        new_values,
        user_id,
        security_impact,
        notes
      ) VALUES (
        NULL, -- System operation
        'tenant_user_effective_permissions',
        'REFRESH',
        gen_random_uuid(),
        jsonb_build_object(
          'refresh_start', refresh_start_time,
          'refresh_end', refresh_end_time,
          'error', error_message
        ),
        auth.uid(),
        'high',
        'Materialized view refresh failed completely: ' || error_message
      );

      -- Re-raise the error
      RAISE;
    END;
  END;
END;
$$;

-- ============================================================================
-- Create trigger function
-- ============================================================================

-- Trigger function to safely refresh the materialized view
CREATE OR REPLACE FUNCTION trigger_refresh_effective_permissions_safe()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Schedule refresh in a safe way
  PERFORM refresh_tenant_user_effective_permissions_safe();
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the original operation
  BEGIN
    INSERT INTO rbac_audit_log (
      tenant_id,
      table_name,
      operation,
      record_id,
      user_id,
      security_impact,
      notes
    ) VALUES (
      NULL,
      'materialized_view_refresh',
      'ERROR',
      gen_random_uuid(),
      auth.uid(),
      'medium',
      'Failed to refresh materialized view: ' || SQLERRM
    );
  EXCEPTION WHEN OTHERS THEN
    -- If even logging fails, continue with the original operation
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- Create triggers (simplified - only direct permissions, no bundles)
-- ============================================================================

-- Trigger on user_roles changes
CREATE TRIGGER refresh_effective_permissions_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

-- Trigger on role_permissions changes
CREATE TRIGGER refresh_effective_permissions_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION refresh_tenant_user_effective_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_tenant_user_effective_permissions_safe() TO authenticated;

-- ============================================================================
-- Initial population
-- ============================================================================

-- Populate the materialized view with current data
SELECT refresh_tenant_user_effective_permissions_safe();

-- ============================================================================
-- Add documentation
-- ============================================================================

COMMENT ON MATERIALIZED VIEW tenant_user_effective_permissions IS
  'Simplified pre-computed view of all effective permissions for users within tenants (direct role-to-permission assignments only, no bundles). Updated automatically via triggers.';

COMMENT ON FUNCTION refresh_tenant_user_effective_permissions() IS
  'Refreshes the materialized view, trying concurrent refresh first with regular refresh fallback.';

COMMENT ON FUNCTION refresh_tenant_user_effective_permissions_safe() IS
  'Safe refresh with comprehensive error handling and audit logging for the simplified RBAC model.';

-- ============================================================================
-- Success confirmation
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Materialized view tenant_user_effective_permissions rebuilt successfully without bundle references.';
  RAISE NOTICE 'RBAC simplification complete: Users → Roles → Permissions (direct assignment only)';
END $$;