-- =============================================================================
-- Migration: Fix bulk_delete_tenants - use only verified existing tables
-- =============================================================================
-- Description: Fixes the bulk_delete_tenants function to only reference tables
-- that actually exist in the schema. Previous version referenced tables like
-- 'delegation_logs', 'profiles', etc. that don't exist.
-- =============================================================================

-- Drop and recreate the function with only verified tables
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
      -- =========================================================================
      -- DELETE IN FK-SAFE ORDER
      -- Only delete from tables that actually exist in the schema
      -- Most tables have ON DELETE CASCADE from tenants, so explicit deletes
      -- are for safety and to handle any that don't have CASCADE
      -- =========================================================================

      -- 1. Delegation-related tables (verified to exist)
      DELETE FROM delegation_templates WHERE tenant_id = v_tenant_id;
      DELETE FROM delegation_permissions WHERE tenant_id = v_tenant_id;
      DELETE FROM delegation_scopes WHERE tenant_id = v_tenant_id;

      -- 2. RBAC tables
      DELETE FROM user_roles WHERE tenant_id = v_tenant_id;
      DELETE FROM role_permissions WHERE tenant_id = v_tenant_id;
      DELETE FROM roles WHERE tenant_id = v_tenant_id;

      -- 3. Licensing tables
      DELETE FROM tenant_feature_grants WHERE tenant_id = v_tenant_id;
      DELETE FROM license_assignments WHERE tenant_id = v_tenant_id;
      DELETE FROM licenses WHERE tenant_id = v_tenant_id;

      -- 4. Family tables (delete family_members before families)
      DELETE FROM family_members WHERE family_id IN (
        SELECT id FROM families WHERE tenant_id = v_tenant_id
      );
      DELETE FROM families WHERE tenant_id = v_tenant_id;

      -- 5. Member tables
      DELETE FROM members WHERE tenant_id = v_tenant_id;

      -- 6. Finance tables
      DELETE FROM donations WHERE tenant_id = v_tenant_id;
      DELETE FROM offering_batches WHERE tenant_id = v_tenant_id;
      DELETE FROM income_transactions WHERE tenant_id = v_tenant_id;
      DELETE FROM financial_transactions WHERE tenant_id = v_tenant_id;
      DELETE FROM budgets WHERE tenant_id = v_tenant_id;
      DELETE FROM accounts WHERE tenant_id = v_tenant_id;
      DELETE FROM funds WHERE tenant_id = v_tenant_id;
      DELETE FROM designated_funds WHERE tenant_id = v_tenant_id;
      DELETE FROM fiscal_periods WHERE tenant_id = v_tenant_id;
      DELETE FROM fiscal_years WHERE tenant_id = v_tenant_id;

      -- 7. Calendar/Event tables
      DELETE FROM calendar_event_reminders WHERE event_id IN (
        SELECT id FROM calendar_events WHERE tenant_id = v_tenant_id
      );
      DELETE FROM calendar_event_attendees WHERE event_id IN (
        SELECT id FROM calendar_events WHERE tenant_id = v_tenant_id
      );
      DELETE FROM calendar_events WHERE tenant_id = v_tenant_id;
      DELETE FROM calendar_categories WHERE tenant_id = v_tenant_id;

      -- 8. Communication tables
      DELETE FROM messages WHERE tenant_id = v_tenant_id;
      DELETE FROM message_threads WHERE tenant_id = v_tenant_id;
      DELETE FROM announcements WHERE tenant_id = v_tenant_id;
      DELETE FROM campaigns WHERE tenant_id = v_tenant_id;
      DELETE FROM communication_templates WHERE tenant_id = v_tenant_id;
      DELETE FROM communication_campaigns WHERE tenant_id = v_tenant_id;
      DELETE FROM campaign_recipients WHERE campaign_id IN (
        SELECT id FROM communication_campaigns WHERE tenant_id = v_tenant_id
      );
      DELETE FROM communication_preferences WHERE tenant_id = v_tenant_id;

      -- 9. Ministry/Scheduler tables
      DELETE FROM schedule_attendance WHERE schedule_id IN (
        SELECT id FROM ministry_schedules WHERE tenant_id = v_tenant_id
      );
      DELETE FROM schedule_registrations WHERE schedule_id IN (
        SELECT id FROM ministry_schedules WHERE tenant_id = v_tenant_id
      );
      DELETE FROM schedule_team_assignments WHERE schedule_id IN (
        SELECT id FROM ministry_schedules WHERE tenant_id = v_tenant_id
      );
      DELETE FROM schedule_occurrences WHERE schedule_id IN (
        SELECT id FROM ministry_schedules WHERE tenant_id = v_tenant_id
      );
      DELETE FROM ministry_schedules WHERE tenant_id = v_tenant_id;
      DELETE FROM ministry_teams WHERE ministry_id IN (
        SELECT id FROM ministries WHERE tenant_id = v_tenant_id
      );
      DELETE FROM ministries WHERE tenant_id = v_tenant_id;

      -- 10. Settings and audit tables
      DELETE FROM settings WHERE tenant_id = v_tenant_id;
      DELETE FROM audit_logs WHERE tenant_id = v_tenant_id;
      DELETE FROM error_logs WHERE tenant_id = v_tenant_id;
      DELETE FROM rbac_audit_log WHERE tenant_id = v_tenant_id;
      DELETE FROM search_history WHERE tenant_id = v_tenant_id;

      -- 11. Menu/UI tables
      DELETE FROM role_menu_items WHERE tenant_id = v_tenant_id;
      DELETE FROM menu_items WHERE tenant_id = v_tenant_id;

      -- 12. Media/Storage tables
      DELETE FROM tenant_media WHERE tenant_id = v_tenant_id;

      -- 13. Goals/Planning tables
      DELETE FROM key_result_progress_updates WHERE key_result_id IN (
        SELECT kr.id FROM key_results kr
        JOIN objectives o ON kr.objective_id = o.id
        JOIN goals g ON o.goal_id = g.id
        WHERE g.tenant_id = v_tenant_id
      );
      DELETE FROM key_results WHERE objective_id IN (
        SELECT o.id FROM objectives o
        JOIN goals g ON o.goal_id = g.id
        WHERE g.tenant_id = v_tenant_id
      );
      DELETE FROM objectives WHERE goal_id IN (
        SELECT id FROM goals WHERE tenant_id = v_tenant_id
      );
      DELETE FROM goals WHERE tenant_id = v_tenant_id;
      DELETE FROM goal_categories WHERE tenant_id = v_tenant_id;

      -- 14. Notebook tables
      DELETE FROM notebook_activity_log WHERE notebook_id IN (
        SELECT id FROM notebooks WHERE tenant_id = v_tenant_id
      );
      DELETE FROM notebook_attachments WHERE page_id IN (
        SELECT np.id FROM notebook_pages np
        JOIN notebook_sections ns ON np.section_id = ns.id
        JOIN notebooks n ON ns.notebook_id = n.id
        WHERE n.tenant_id = v_tenant_id
      );
      DELETE FROM notebook_shares WHERE notebook_id IN (
        SELECT id FROM notebooks WHERE tenant_id = v_tenant_id
      );
      DELETE FROM notebook_pages WHERE section_id IN (
        SELECT ns.id FROM notebook_sections ns
        JOIN notebooks n ON ns.notebook_id = n.id
        WHERE n.tenant_id = v_tenant_id
      );
      DELETE FROM notebook_sections WHERE notebook_id IN (
        SELECT id FROM notebooks WHERE tenant_id = v_tenant_id
      );
      DELETE FROM notebooks WHERE tenant_id = v_tenant_id;

      -- 15. AI Credits tables
      DELETE FROM ai_credit_transactions WHERE tenant_id = v_tenant_id;
      DELETE FROM ai_credit_purchases WHERE tenant_id = v_tenant_id;
      DELETE FROM tenant_ai_credits WHERE tenant_id = v_tenant_id;

      -- 16. Notifications tables
      DELETE FROM notification_queue WHERE tenant_id = v_tenant_id;
      DELETE FROM notification_preferences WHERE tenant_id = v_tenant_id;

      -- 17. Tenant user associations
      DELETE FROM tenant_users WHERE tenant_id = v_tenant_id;

      -- 18. Onboarding progress
      DELETE FROM onboarding_progress WHERE tenant_id = v_tenant_id;

      -- 19. Invitations
      DELETE FROM invitations WHERE tenant_id = v_tenant_id;

      -- 20. Finally, delete the tenant record itself
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
   Returns JSON with deletion status for each tenant and count of deleted auth users.
   Only references tables that exist in the schema as of 2026-01-28.
   WARNING: This operation is irreversible.';
