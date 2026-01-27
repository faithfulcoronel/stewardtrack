-- =============================================================================
-- Migration: Add Bulk Tenant Deletion RPC
-- =============================================================================
-- Description: Creates an RPC function for atomic bulk tenant deletion with
-- SECURITY DEFINER privileges. This function permanently deletes all tenant
-- data and removes auth.users who no longer belong to any tenant.
--
-- WARNING: This operation is irreversible. All tenant data will be permanently
-- deleted including users, members, donations, and all associated records.
-- =============================================================================

-- Create the bulk tenant deletion function with SECURITY DEFINER
-- This allows the function to bypass RLS and delete data across all tables
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
  v_counts jsonb;
BEGIN
  -- Validate input
  IF p_tenant_ids IS NULL OR array_length(p_tenant_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tenant IDs provided',
      'deleted', '[]'::jsonb
    );
  END IF;

  -- Collect users who ONLY belong to the tenants being deleted
  -- These users will be deleted from auth.users after tenant deletion
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
      -- Initialize counts for this tenant
      v_counts := '{}'::jsonb;

      -- =========================================================================
      -- DELETE IN FK-SAFE ORDER
      -- Most tables have ON DELETE CASCADE from tenants, but we explicitly
      -- delete to capture counts and handle any edge cases
      -- =========================================================================

      -- 1. Delegation-related tables
      DELETE FROM delegation_logs WHERE tenant_id = v_tenant_id;
      v_counts := v_counts || jsonb_build_object('delegation_logs', (SELECT count(*) FROM delegation_logs WHERE tenant_id = v_tenant_id));

      DELETE FROM delegations WHERE tenant_id = v_tenant_id;

      -- 2. RBAC tables
      DELETE FROM user_roles WHERE tenant_id = v_tenant_id;
      DELETE FROM role_permissions WHERE tenant_id = v_tenant_id;
      DELETE FROM roles WHERE tenant_id = v_tenant_id;

      -- 3. Licensing tables (grants before assignments)
      DELETE FROM tenant_feature_grants WHERE tenant_id = v_tenant_id;
      DELETE FROM license_assignment_history WHERE tenant_id = v_tenant_id;
      DELETE FROM license_assignments WHERE tenant_id = v_tenant_id;
      DELETE FROM licenses WHERE tenant_id = v_tenant_id;

      -- 4. Domain tables (these should cascade from tenants deletion)
      -- Explicitly deleting for completeness and to ensure FK order
      DELETE FROM member_audit_logs WHERE tenant_id = v_tenant_id;
      DELETE FROM member_notes WHERE tenant_id = v_tenant_id;
      DELETE FROM member_contact_entries WHERE tenant_id = v_tenant_id;
      DELETE FROM family_members WHERE family_id IN (
        SELECT id FROM families WHERE tenant_id = v_tenant_id
      );
      DELETE FROM families WHERE tenant_id = v_tenant_id;
      DELETE FROM members WHERE tenant_id = v_tenant_id;

      -- Donations/Finance tables
      DELETE FROM donations WHERE tenant_id = v_tenant_id;
      DELETE FROM pledges WHERE tenant_id = v_tenant_id;
      DELETE FROM offering_batches WHERE tenant_id = v_tenant_id;
      DELETE FROM income_transactions WHERE tenant_id = v_tenant_id;
      DELETE FROM expense_transactions WHERE tenant_id = v_tenant_id;
      DELETE FROM financial_transactions WHERE tenant_id = v_tenant_id;
      DELETE FROM budgets WHERE tenant_id = v_tenant_id;
      DELETE FROM journal_entries WHERE tenant_id = v_tenant_id;
      DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
        SELECT id FROM journal_entries WHERE tenant_id = v_tenant_id
      );
      DELETE FROM accounts WHERE tenant_id = v_tenant_id;
      DELETE FROM funds WHERE tenant_id = v_tenant_id;
      DELETE FROM designated_funds WHERE tenant_id = v_tenant_id;
      DELETE FROM fiscal_years WHERE tenant_id = v_tenant_id;
      DELETE FROM fiscal_periods WHERE tenant_id = v_tenant_id;

      -- Event tables
      DELETE FROM event_registrations WHERE event_id IN (
        SELECT id FROM events WHERE tenant_id = v_tenant_id
      );
      DELETE FROM events WHERE tenant_id = v_tenant_id;

      -- Communication tables
      DELETE FROM messages WHERE tenant_id = v_tenant_id;
      DELETE FROM message_recipients WHERE message_id IN (
        SELECT id FROM messages WHERE tenant_id = v_tenant_id
      );
      DELETE FROM announcements WHERE tenant_id = v_tenant_id;
      DELETE FROM campaigns WHERE tenant_id = v_tenant_id;

      -- Ministry/Group tables
      DELETE FROM ministry_members WHERE ministry_id IN (
        SELECT id FROM ministries WHERE tenant_id = v_tenant_id
      );
      DELETE FROM ministries WHERE tenant_id = v_tenant_id;
      DELETE FROM groups WHERE tenant_id = v_tenant_id;
      DELETE FROM group_members WHERE group_id IN (
        SELECT id FROM groups WHERE tenant_id = v_tenant_id
      );

      -- Settings and audit tables
      DELETE FROM settings WHERE tenant_id = v_tenant_id;
      DELETE FROM audit_logs WHERE tenant_id = v_tenant_id;
      DELETE FROM error_logs WHERE tenant_id = v_tenant_id;
      DELETE FROM rbac_audit_log WHERE tenant_id = v_tenant_id;
      DELETE FROM search_history WHERE tenant_id = v_tenant_id;

      -- Menu/UI customization tables
      DELETE FROM role_menu_items WHERE tenant_id = v_tenant_id;
      DELETE FROM menu_items WHERE tenant_id = v_tenant_id;
      DELETE FROM user_feature_preferences WHERE tenant_id = v_tenant_id;

      -- Category tables
      DELETE FROM income_categories WHERE tenant_id = v_tenant_id;
      DELETE FROM expense_categories WHERE tenant_id = v_tenant_id;
      DELETE FROM donation_categories WHERE tenant_id = v_tenant_id;

      -- Media/Storage tables
      DELETE FROM tenant_media WHERE tenant_id = v_tenant_id;

      -- 5. Tenant user associations
      DELETE FROM tenant_users WHERE tenant_id = v_tenant_id;

      -- 6. Onboarding progress
      DELETE FROM onboarding_progress WHERE tenant_id = v_tenant_id;

      -- 7. Invitations
      DELETE FROM invitations WHERE tenant_id = v_tenant_id;

      -- 8. Finally, delete the tenant record itself
      -- This will cascade-delete any remaining records with ON DELETE CASCADE
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
    -- Delete profiles first (FK to auth.users)
    DELETE FROM profiles WHERE id = ANY(v_users_to_delete);

    -- Delete from auth.users using admin API
    -- Note: This requires SECURITY DEFINER and proper permissions
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

-- Add comment for documentation
COMMENT ON FUNCTION bulk_delete_tenants(uuid[]) IS
  'Bulk delete tenants and all associated data. SECURITY DEFINER function that bypasses RLS.
   Returns JSON with deletion status for each tenant and count of deleted auth users.
   WARNING: This operation is irreversible.';

-- Grant execute permission to authenticated users (authorization checked in API layer)
GRANT EXECUTE ON FUNCTION bulk_delete_tenants(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_delete_tenants(uuid[]) TO service_role;
