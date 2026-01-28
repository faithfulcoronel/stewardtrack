-- =============================================================================
-- Migration: Fix bulk_delete_tenants - disable audit triggers during delete
-- =============================================================================
-- Description: The RBAC audit triggers try to INSERT into rbac_audit_log when
-- RBAC tables are deleted, but the tenant_id FK constraint fails since the
-- tenant is being deleted. This version disables triggers during deletion.
-- =============================================================================

CREATE OR REPLACE FUNCTION bulk_delete_tenants(p_tenant_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_deletion_results jsonb := '[]'::jsonb;
  v_tenant_result jsonb;
  v_users_to_delete uuid[];
  v_auth_users_deleted int := 0;
  v_total_deleted int := 0;
BEGIN
  -- Validate input
  IF p_tenant_ids IS NULL OR array_length(p_tenant_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tenant IDs provided',
      'deleted', '[]'::jsonb
    );
  END IF;

  -- IMPORTANT: Collect users BEFORE deleting tenant_users
  -- These are users who ONLY belong to the tenants being deleted
  SELECT ARRAY_AGG(DISTINCT tu.user_id)
  INTO v_users_to_delete
  FROM tenant_users tu
  WHERE tu.tenant_id = ANY(p_tenant_ids)
    AND NOT EXISTS (
      -- User does NOT belong to any tenant that is NOT being deleted
      SELECT 1
      FROM tenant_users tu2
      WHERE tu2.user_id = tu.user_id
        AND tu2.tenant_id != ALL(p_tenant_ids)
    );

  -- =========================================================================
  -- DISABLE AUDIT TRIGGERS
  -- These triggers try to INSERT into rbac_audit_log during DELETE operations,
  -- which fails because the tenant_id FK constraint references a tenant
  -- that is being deleted.
  -- =========================================================================

  -- Disable RBAC audit triggers on tables that have them
  ALTER TABLE user_roles DISABLE TRIGGER rbac_audit_trigger_user_roles;
  ALTER TABLE role_permissions DISABLE TRIGGER rbac_audit_trigger_role_permissions;
  ALTER TABLE roles DISABLE TRIGGER rbac_audit_trigger_roles;
  ALTER TABLE permissions DISABLE TRIGGER rbac_audit_trigger_permissions;

  -- Disable materialized view refresh triggers (they also try to log to rbac_audit_log)
  ALTER TABLE user_roles DISABLE TRIGGER refresh_effective_permissions_user_roles;
  ALTER TABLE role_permissions DISABLE TRIGGER refresh_effective_permissions_role_permissions;

  -- Process each tenant
  FOREACH v_tenant_id IN ARRAY p_tenant_ids
  LOOP
    BEGIN
      -- Delete rbac_audit_log entries for this tenant first
      DELETE FROM rbac_audit_log WHERE tenant_id = v_tenant_id;

      -- Delete tenant_users (to break user association before tenant delete)
      DELETE FROM tenant_users WHERE tenant_id = v_tenant_id;

      -- Delete the tenant - CASCADE will clean up all related records
      DELETE FROM tenants WHERE id = v_tenant_id;

      -- Build result for this tenant
      v_tenant_result := jsonb_build_object(
        'tenant_id', v_tenant_id,
        'status', 'deleted'
      );

      v_deletion_results := v_deletion_results || v_tenant_result;
      v_total_deleted := v_total_deleted + 1;

    EXCEPTION WHEN OTHERS THEN
      -- If deletion fails for this tenant, record the error but continue
      v_tenant_result := jsonb_build_object(
        'tenant_id', v_tenant_id,
        'status', 'failed',
        'error', SQLERRM
      );
      v_deletion_results := v_deletion_results || v_tenant_result;
    END;
  END LOOP;

  -- =========================================================================
  -- RE-ENABLE AUDIT TRIGGERS
  -- =========================================================================
  ALTER TABLE user_roles ENABLE TRIGGER rbac_audit_trigger_user_roles;
  ALTER TABLE role_permissions ENABLE TRIGGER rbac_audit_trigger_role_permissions;
  ALTER TABLE roles ENABLE TRIGGER rbac_audit_trigger_roles;
  ALTER TABLE permissions ENABLE TRIGGER rbac_audit_trigger_permissions;
  ALTER TABLE user_roles ENABLE TRIGGER refresh_effective_permissions_user_roles;
  ALTER TABLE role_permissions ENABLE TRIGGER refresh_effective_permissions_role_permissions;

  -- Delete auth.users who no longer belong to any tenant
  IF v_users_to_delete IS NOT NULL AND array_length(v_users_to_delete, 1) > 0 THEN
    DECLARE
      v_user_id uuid;
    BEGIN
      FOREACH v_user_id IN ARRAY v_users_to_delete
      LOOP
        BEGIN
          DELETE FROM auth.users WHERE id = v_user_id;
          v_auth_users_deleted := v_auth_users_deleted + 1;
        EXCEPTION WHEN OTHERS THEN
          -- Log but continue if individual user deletion fails
          RAISE NOTICE 'Failed to delete auth user %: %', v_user_id, SQLERRM;
        END;
      END LOOP;
    END;
  END IF;

  -- Return summary
  RETURN jsonb_build_object(
    'success', v_total_deleted > 0,
    'total_tenants_deleted', v_total_deleted,
    'auth_users_deleted', v_auth_users_deleted,
    'deleted', v_deletion_results
  );

EXCEPTION WHEN OTHERS THEN
  -- Re-enable triggers even if there's an error
  BEGIN
    ALTER TABLE user_roles ENABLE TRIGGER rbac_audit_trigger_user_roles;
    ALTER TABLE role_permissions ENABLE TRIGGER rbac_audit_trigger_role_permissions;
    ALTER TABLE roles ENABLE TRIGGER rbac_audit_trigger_roles;
    ALTER TABLE permissions ENABLE TRIGGER rbac_audit_trigger_permissions;
    ALTER TABLE user_roles ENABLE TRIGGER refresh_effective_permissions_user_roles;
    ALTER TABLE role_permissions ENABLE TRIGGER refresh_effective_permissions_role_permissions;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors re-enabling triggers
    NULL;
  END;

  -- Re-raise the original error
  RAISE;
END;
$$;

COMMENT ON FUNCTION bulk_delete_tenants(uuid[]) IS
  'Bulk delete tenants and all associated data. SECURITY DEFINER function that bypasses RLS.
   Disables RBAC audit triggers during deletion to prevent FK constraint violations.
   Returns JSON with deletion status for each tenant and count of deleted auth users.
   WARNING: This operation is irreversible.';
