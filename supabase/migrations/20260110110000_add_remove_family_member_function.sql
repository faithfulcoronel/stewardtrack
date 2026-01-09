-- Migration: Add stored procedure to remove member from family
--
-- Issue: The RLS policy on family_members uses user_has_permission_for_tenant
-- which causes nested RLS issues even with SECURITY DEFINER and row_security=off
--
-- Solution: Create a stored procedure that:
-- 1. Checks permissions explicitly
-- 2. Performs the update with SECURITY DEFINER (bypasses RLS)
-- 3. Returns success/failure
--
-- This is a common Supabase pattern for operations that need RLS bypass
--
-- Date: 2026-01-10

BEGIN;

-- ============================================================================
-- STEP 1: Create the remove_member_from_family function
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_member_from_family(
  p_family_id uuid,
  p_member_id uuid,
  p_tenant_id uuid
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
  v_record_exists boolean;
  v_rows_affected integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check permission (direct query to avoid RLS issues)
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id AND ur.tenant_id = rp.tenant_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = v_user_id
      AND ur.tenant_id = p_tenant_id
      AND p.code = 'members:edit'
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission denied: members:edit required'
    );
  END IF;

  -- Check if record exists
  SELECT EXISTS (
    SELECT 1
    FROM family_members
    WHERE family_id = p_family_id
      AND member_id = p_member_id
      AND tenant_id = p_tenant_id
  ) INTO v_record_exists;

  IF NOT v_record_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Family member record not found'
    );
  END IF;

  -- Perform the soft delete (set is_active = false)
  UPDATE family_members
  SET
    is_active = false,
    left_at = CURRENT_DATE,
    updated_at = NOW()
  WHERE family_id = p_family_id
    AND member_id = p_member_id
    AND tenant_id = p_tenant_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'rows_affected', v_rows_affected
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No rows updated'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION remove_member_from_family(uuid, uuid, uuid) IS
  'Removes a member from a family (soft delete). Bypasses RLS but checks members:edit permission internally.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION remove_member_from_family(uuid, uuid, uuid) TO authenticated;

-- ============================================================================
-- Success message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Created remove_member_from_family function';
END $$;

COMMIT;
