-- =====================================================================================
-- MIGRATION: Fix can_user Function - Remove Bundle References
-- =====================================================================================
-- Updates can_user function to remove bundle-based permission checks
-- The previous migration fixed get_user_effective_permissions but missed can_user
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- Fix can_user function - Remove bundle-based permission checks
-- =====================================================================================
DROP FUNCTION IF EXISTS can_user(text, uuid);

CREATE OR REPLACE FUNCTION can_user(required_permission text, target_tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  -- Use provided tenant_id or determine from context
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check direct role permissions only (bundle-based checks removed)
  IF EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = effective_tenant_id
      AND rp.tenant_id = effective_tenant_id
      AND p.code = required_permission
      AND p.tenant_id = effective_tenant_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION can_user(text, uuid) TO authenticated;

COMMENT ON FUNCTION can_user(text, uuid) IS
  'Returns true if the logged in user has the given permission within the specified tenant (bundles removed).';

COMMIT;
