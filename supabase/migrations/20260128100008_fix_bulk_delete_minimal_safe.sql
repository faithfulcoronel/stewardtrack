-- =============================================================================
-- Migration: Fix bulk_delete_tenants - minimal safe version
-- =============================================================================
-- Description: Creates a minimal, safe version of bulk_delete_tenants that
-- relies on ON DELETE CASCADE from the tenants table for most deletions.
-- Only explicitly deletes where necessary (collecting orphaned users).
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

  -- Process each tenant
  FOREACH v_tenant_id IN ARRAY p_tenant_ids
  LOOP
    BEGIN
      -- =========================================================================
      -- SIMPLE APPROACH: Let CASCADE handle everything
      -- Most tables have ON DELETE CASCADE from tenants, so we just need to
      -- delete the tenant record and everything else follows.
      -- =========================================================================

      -- Delete tenant_users first (to break user association before tenant delete)
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
END;
$$;

COMMENT ON FUNCTION bulk_delete_tenants(uuid[]) IS
  'Bulk delete tenants and all associated data. SECURITY DEFINER function that bypasses RLS.
   Relies on ON DELETE CASCADE from tenants table for most table deletions.
   Returns JSON with deletion status for each tenant and count of deleted auth users.
   WARNING: This operation is irreversible.';
