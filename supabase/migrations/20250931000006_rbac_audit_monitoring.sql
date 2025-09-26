/*
  # RBAC Audit Logging and Monitoring

  This migration creates comprehensive audit logging and monitoring
  for RBAC changes, including automatic refresh triggers and
  security monitoring.
*/

-- Create audit log table for RBAC changes
CREATE TABLE IF NOT EXISTS rbac_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id uuid NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  ip_address inet,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now(),
  security_impact text, -- 'low', 'medium', 'high', 'critical'
  notes text
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS rbac_audit_log_tenant_id_idx ON rbac_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS rbac_audit_log_table_operation_idx ON rbac_audit_log(table_name, operation);
CREATE INDEX IF NOT EXISTS rbac_audit_log_user_id_idx ON rbac_audit_log(user_id);
CREATE INDEX IF NOT EXISTS rbac_audit_log_created_at_idx ON rbac_audit_log(created_at);
CREATE INDEX IF NOT EXISTS rbac_audit_log_security_impact_idx ON rbac_audit_log(security_impact);
CREATE INDEX IF NOT EXISTS rbac_audit_log_record_id_idx ON rbac_audit_log(record_id);

-- Enable RLS
ALTER TABLE rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "RBAC audit logs viewable within tenant" ON rbac_audit_log
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION rbac_audit_trigger()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  tenant_id_value uuid;
  old_record jsonb;
  new_record jsonb;
  changed_fields_array text[] := ARRAY[]::text[];
  field_name text;
  security_impact_level text := 'medium';
BEGIN
  -- Get current user info
  SELECT auth.uid() INTO current_user_id;
  SELECT COALESCE(raw_user_meta_data->>'email', email) INTO current_user_email
  FROM auth.users WHERE id = current_user_id;

  -- Extract tenant_id from the record
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    tenant_id_value := (to_jsonb(NEW)->>'tenant_id')::uuid;
  ELSE
    tenant_id_value := (to_jsonb(OLD)->>'tenant_id')::uuid;
  END IF;

  -- Convert records to jsonb and identify changed fields
  IF TG_OP = 'INSERT' THEN
    new_record := to_jsonb(NEW);
    security_impact_level := CASE
      WHEN TG_TABLE_NAME IN ('roles', 'permissions', 'permission_bundles') THEN 'high'
      WHEN TG_TABLE_NAME IN ('user_roles', 'role_permissions', 'role_bundles') THEN 'high'
      ELSE 'medium'
    END;
  ELSIF TG_OP = 'UPDATE' THEN
    old_record := to_jsonb(OLD);
    new_record := to_jsonb(NEW);

    -- Identify changed fields
    FOR field_name IN SELECT jsonb_object_keys(new_record) LOOP
      IF old_record->>field_name IS DISTINCT FROM new_record->>field_name THEN
        changed_fields_array := array_append(changed_fields_array, field_name);
      END IF;
    END LOOP;

    -- Determine security impact based on changed fields
    security_impact_level := CASE
      WHEN 'metadata_key' = ANY(changed_fields_array) THEN 'high'
      WHEN 'scope' = ANY(changed_fields_array) THEN 'high'
      WHEN array_length(changed_fields_array, 1) > 5 THEN 'high'
      WHEN TG_TABLE_NAME IN ('user_roles', 'role_permissions') THEN 'high'
      ELSE 'medium'
    END;
  ELSIF TG_OP = 'DELETE' THEN
    old_record := to_jsonb(OLD);
    security_impact_level := CASE
      WHEN TG_TABLE_NAME IN ('roles', 'permissions', 'permission_bundles') THEN 'critical'
      WHEN TG_TABLE_NAME IN ('user_roles', 'role_permissions', 'role_bundles') THEN 'high'
      ELSE 'medium'
    END;
  END IF;

  -- Insert audit record
  INSERT INTO rbac_audit_log (
    tenant_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    changed_fields,
    user_id,
    user_email,
    security_impact,
    created_at
  ) VALUES (
    tenant_id_value,
    TG_TABLE_NAME,
    TG_OP,
    COALESCE((new_record->>'id')::uuid, (old_record->>'id')::uuid),
    old_record,
    new_record,
    changed_fields_array,
    current_user_id,
    current_user_email,
    security_impact_level,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers on all RBAC tables
DROP TRIGGER IF EXISTS rbac_audit_trigger_roles ON roles;
CREATE TRIGGER rbac_audit_trigger_roles
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_audit_trigger_permissions ON permissions;
CREATE TRIGGER rbac_audit_trigger_permissions
  AFTER INSERT OR UPDATE OR DELETE ON permissions
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_audit_trigger_permission_bundles ON permission_bundles;
CREATE TRIGGER rbac_audit_trigger_permission_bundles
  AFTER INSERT OR UPDATE OR DELETE ON permission_bundles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_audit_trigger_user_roles ON user_roles;
CREATE TRIGGER rbac_audit_trigger_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_audit_trigger_role_permissions ON role_permissions;
CREATE TRIGGER rbac_audit_trigger_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_audit_trigger_role_bundles ON role_bundles;
CREATE TRIGGER rbac_audit_trigger_role_bundles
  AFTER INSERT OR UPDATE OR DELETE ON role_bundles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_audit_trigger_bundle_permissions ON bundle_permissions;
CREATE TRIGGER rbac_audit_trigger_bundle_permissions
  AFTER INSERT OR UPDATE OR DELETE ON bundle_permissions
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_audit_trigger_surface_bindings ON rbac_surface_bindings;
CREATE TRIGGER rbac_audit_trigger_surface_bindings
  AFTER INSERT OR UPDATE OR DELETE ON rbac_surface_bindings
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

-- Enhanced materialized view refresh with better error handling
CREATE OR REPLACE FUNCTION refresh_tenant_user_effective_permissions_safe()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  refresh_start_time timestamptz;
  refresh_end_time timestamptz;
  error_message text;
BEGIN
  refresh_start_time := now();

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_user_effective_permissions;
    refresh_end_time := now();

    -- Log successful refresh
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
        'duration_ms', EXTRACT(epoch FROM (refresh_end_time - refresh_start_time)) * 1000
      ),
      auth.uid(),
      'low',
      'Materialized view refresh completed successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    refresh_end_time := now();

    -- Log failed refresh
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
      'Materialized view refresh failed: ' || error_message
    );

    -- Re-raise the error
    RAISE;
  END;
END;
$$;

-- Enhanced trigger for materialized view refresh
CREATE OR REPLACE FUNCTION trigger_refresh_effective_permissions_safe()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Schedule refresh in a safe way (this could be enhanced with a job queue)
  PERFORM refresh_tenant_user_effective_permissions_safe();
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the original operation
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

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update triggers to use the safe refresh function
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

DROP TRIGGER IF EXISTS refresh_effective_permissions_surface_bindings ON rbac_surface_bindings;
CREATE TRIGGER refresh_effective_permissions_surface_bindings
  AFTER INSERT OR UPDATE OR DELETE ON rbac_surface_bindings
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

-- Function to get RBAC health metrics
CREATE OR REPLACE FUNCTION get_rbac_health_metrics(target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  metric_name text,
  metric_value bigint,
  status text,
  details jsonb
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
  orphaned_user_roles bigint;
  users_without_roles bigint;
  roles_without_permissions bigint;
  materialized_view_lag interval;
  recent_critical_changes bigint;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- Check for orphaned user roles
  SELECT COUNT(*) INTO orphaned_user_roles
  FROM user_roles ur
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE ur.tenant_id = effective_tenant_id
    AND r.id IS NULL;

  RETURN QUERY SELECT
    'orphaned_user_roles'::text,
    orphaned_user_roles,
    CASE WHEN orphaned_user_roles = 0 THEN 'healthy' ELSE 'warning' END,
    jsonb_build_object('count', orphaned_user_roles);

  -- Check for users without roles
  SELECT COUNT(DISTINCT tu.user_id) INTO users_without_roles
  FROM tenant_users tu
  LEFT JOIN user_roles ur ON tu.user_id = ur.user_id AND tu.tenant_id = ur.tenant_id
  WHERE tu.tenant_id = effective_tenant_id
    AND ur.user_id IS NULL;

  RETURN QUERY SELECT
    'users_without_roles'::text,
    users_without_roles,
    CASE WHEN users_without_roles = 0 THEN 'healthy' ELSE 'info' END,
    jsonb_build_object('count', users_without_roles);

  -- Check for roles without permissions
  SELECT COUNT(*) INTO roles_without_permissions
  FROM roles r
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN role_bundles rb ON r.id = rb.role_id
  WHERE r.tenant_id = effective_tenant_id
    AND rp.role_id IS NULL
    AND rb.role_id IS NULL;

  RETURN QUERY SELECT
    'roles_without_permissions'::text,
    roles_without_permissions,
    CASE WHEN roles_without_permissions = 0 THEN 'healthy' ELSE 'warning' END,
    jsonb_build_object('count', roles_without_permissions);

  -- Check materialized view freshness
  SELECT now() - MAX(computed_at) INTO materialized_view_lag
  FROM tenant_user_effective_permissions
  WHERE tenant_id = effective_tenant_id;

  RETURN QUERY SELECT
    'materialized_view_lag_minutes'::text,
    EXTRACT(epoch FROM COALESCE(materialized_view_lag, '0 seconds'::interval))::bigint / 60,
    CASE
      WHEN materialized_view_lag IS NULL THEN 'error'
      WHEN materialized_view_lag > '1 hour'::interval THEN 'critical'
      WHEN materialized_view_lag > '15 minutes'::interval THEN 'warning'
      ELSE 'healthy'
    END,
    jsonb_build_object('lag_seconds', EXTRACT(epoch FROM COALESCE(materialized_view_lag, '0 seconds'::interval)));

  -- Check for recent critical changes
  SELECT COUNT(*) INTO recent_critical_changes
  FROM rbac_audit_log
  WHERE tenant_id = effective_tenant_id
    AND security_impact IN ('critical', 'high')
    AND created_at >= now() - '24 hours'::interval;

  RETURN QUERY SELECT
    'recent_critical_changes_24h'::text,
    recent_critical_changes,
    CASE
      WHEN recent_critical_changes > 50 THEN 'warning'
      WHEN recent_critical_changes > 100 THEN 'critical'
      ELSE 'healthy'
    END,
    jsonb_build_object('count', recent_critical_changes);
END;
$$;

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days integer DEFAULT 90)
RETURNS bigint
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM rbac_audit_log
  WHERE created_at < now() - (retention_days || ' days')::interval
    AND security_impact NOT IN ('critical'); -- Keep critical logs longer

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup
  INSERT INTO rbac_audit_log (
    tenant_id,
    table_name,
    operation,
    record_id,
    new_values,
    security_impact,
    notes
  ) VALUES (
    NULL,
    'rbac_audit_log',
    'CLEANUP',
    gen_random_uuid(),
    jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days),
    'low',
    'Automated cleanup of old audit logs'
  );

  RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_tenant_user_effective_permissions_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_rbac_health_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(integer) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE rbac_audit_log IS
  'Comprehensive audit log for all RBAC-related changes with security impact scoring.';
COMMENT ON FUNCTION get_rbac_health_metrics(uuid) IS
  'Returns health metrics for RBAC system including orphaned records and materialized view freshness.';
COMMENT ON FUNCTION cleanup_old_audit_logs(integer) IS
  'Cleans up old audit log entries while preserving critical security events.';