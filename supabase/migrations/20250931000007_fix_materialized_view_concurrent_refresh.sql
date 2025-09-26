/*
  # Fix Materialized View Concurrent Refresh

  This migration fixes the issue with concurrent refresh of the materialized view
  by properly handling the unique index requirements and providing fallback options.
*/

-- Fix the audit log constraint first
ALTER TABLE rbac_audit_log 
DROP CONSTRAINT IF EXISTS rbac_audit_log_operation_check;

ALTER TABLE rbac_audit_log 
ADD CONSTRAINT rbac_audit_log_operation_check 
CHECK (operation IN (
  'CREATE', 'UPDATE', 'DELETE', 'INSERT', 
  'REFRESH', 'GRANT', 'REVOKE', 'LOGIN', 
  'LOGOUT', 'ACCESS', 'ERROR', 'SYSTEM'
));

-- Drop the existing problematic unique index that uses COALESCE
DROP INDEX IF EXISTS tenant_user_effective_permissions_unique_idx;

-- First, let's add a synthetic unique column to make concurrent refresh possible
-- We'll use row_number to create uniqueness across the entire result set
DROP MATERIALIZED VIEW IF EXISTS tenant_user_effective_permissions CASCADE;

CREATE MATERIALIZED VIEW tenant_user_effective_permissions AS
WITH direct_permissions AS (
  -- Direct role-to-permission assignments
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
    NULL::uuid as bundle_id,
    NULL::text as bundle_code,
    'direct' as assignment_type
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_permissions rp ON r.id = rp.role_id AND ur.tenant_id = rp.tenant_id
  JOIN permissions p ON rp.permission_id = p.id AND rp.tenant_id = p.tenant_id
  WHERE ur.tenant_id IS NOT NULL
    AND r.tenant_id IS NOT NULL
    AND p.tenant_id IS NOT NULL
),
bundle_permissions AS (
  -- Bundle-based permissions
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
    pb.id as bundle_id,
    pb.code as bundle_code,
    'bundle' as assignment_type
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_bundles rb ON r.id = rb.role_id AND ur.tenant_id = rb.tenant_id
  JOIN permission_bundles pb ON rb.bundle_id = pb.id AND rb.tenant_id = pb.tenant_id
  JOIN bundle_permissions bp ON pb.id = bp.bundle_id AND pb.tenant_id = bp.tenant_id
  JOIN permissions p ON bp.permission_id = p.id AND bp.tenant_id = p.tenant_id
  WHERE ur.tenant_id IS NOT NULL
    AND r.tenant_id IS NOT NULL
    AND pb.tenant_id IS NOT NULL
    AND p.tenant_id IS NOT NULL
),
all_permissions AS (
  SELECT * FROM direct_permissions
  UNION ALL
  SELECT * FROM bundle_permissions
)
SELECT
  -- Create a synthetic unique ID using hash of the combination
  md5(
    COALESCE(tenant_id::text, '') || '|' ||
    COALESCE(user_id::text, '') || '|' ||
    COALESCE(permission_id::text, '') || '|' ||
    COALESCE(role_id::text, '') || '|' ||
    COALESCE(bundle_id::text, '') || '|' ||
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
  bundle_id,
  bundle_code,
  assignment_type,
  now() as computed_at
FROM all_permissions;

-- Create a proper unique index on the synthetic unique_id
CREATE UNIQUE INDEX tenant_user_effective_permissions_unique_id_idx
ON tenant_user_effective_permissions (unique_id);

-- Create other indexes for fast lookups
CREATE INDEX tenant_user_effective_permissions_tenant_user_idx
ON tenant_user_effective_permissions (tenant_id, user_id);

CREATE INDEX tenant_user_effective_permissions_permission_code_idx
ON tenant_user_effective_permissions (permission_code);

CREATE INDEX tenant_user_effective_permissions_role_metadata_key_idx
ON tenant_user_effective_permissions (role_metadata_key) WHERE role_metadata_key IS NOT NULL;

CREATE INDEX tenant_user_effective_permissions_bundle_code_idx
ON tenant_user_effective_permissions (bundle_code) WHERE bundle_code IS NOT NULL;

-- Create a composite index for the most common query pattern
CREATE INDEX tenant_user_effective_permissions_lookup_idx
ON tenant_user_effective_permissions (tenant_id, user_id, permission_code);

-- Update the refresh function to handle both concurrent and non-concurrent refresh
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

-- Enhanced safe refresh function with better error handling
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

-- Update the trigger function to use the safe refresh
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

-- Recreate all triggers with the safe refresh function
DROP TRIGGER IF EXISTS refresh_effective_permissions_user_roles ON user_roles;
CREATE TRIGGER refresh_effective_permissions_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

DROP TRIGGER IF EXISTS refresh_effective_permissions_role_permissions ON role_permissions;
CREATE TRIGGER refresh_effective_permissions_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

DROP TRIGGER IF EXISTS refresh_effective_permissions_role_bundles ON role_bundles;
CREATE TRIGGER refresh_effective_permissions_role_bundles
  AFTER INSERT OR UPDATE OR DELETE ON role_bundles
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

DROP TRIGGER IF EXISTS refresh_effective_permissions_bundle_permissions ON bundle_permissions;
CREATE TRIGGER refresh_effective_permissions_bundle_permissions
  AFTER INSERT OR UPDATE OR DELETE ON bundle_permissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

-- Initial population of the materialized view
SELECT refresh_tenant_user_effective_permissions_safe();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_tenant_user_effective_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_tenant_user_effective_permissions_safe() TO authenticated;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW tenant_user_effective_permissions IS
  'Pre-computed view of all effective permissions for users within tenants, with proper unique index for concurrent refresh support.';
COMMENT ON FUNCTION refresh_tenant_user_effective_permissions() IS
  'Refreshes the materialized view, trying concurrent refresh first with regular refresh fallback.';
COMMENT ON FUNCTION refresh_tenant_user_effective_permissions_safe() IS
  'Safe refresh with comprehensive error handling and audit logging.';