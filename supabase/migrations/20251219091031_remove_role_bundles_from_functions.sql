-- =====================================================================================
-- MIGRATION: Remove role_bundles References from Database Functions
-- =====================================================================================
-- Fixes any remaining database functions that reference the deprecated role_bundles table
-- This migration recreates functions to remove bundle dependencies
-- =====================================================================================

BEGIN;

-- Drop and recreate get_user_effective_permissions without role_bundles
DROP FUNCTION IF EXISTS get_user_effective_permissions(uuid, uuid);

CREATE OR REPLACE FUNCTION get_user_effective_permissions(
  target_user_id uuid,
  target_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  permission_id uuid,
  permission_code text,
  permission_name text,
  permission_description text,
  permission_module text,
  permission_action text,
  source text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  -- Determine effective tenant ID
  IF target_tenant_id IS NULL THEN
    SELECT tenant_id INTO effective_tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid()
    LIMIT 1;
  ELSE
    effective_tenant_id := target_tenant_id;
  END IF;

  -- Return permissions from direct role assignments only (no bundles)
  RETURN QUERY
  SELECT DISTINCT
    p.id as permission_id,
    p.code as permission_code,
    p.name as permission_name,
    p.description as permission_description,
    p.module as permission_module,
    p.action as permission_action,
    'role' as source
  FROM permissions p
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = target_user_id
    AND ur.tenant_id = effective_tenant_id
    AND rp.tenant_id = effective_tenant_id
  ORDER BY p.code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_effective_permissions(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION get_user_effective_permissions(uuid, uuid) IS
  'Returns all effective permissions for a user from their role assignments (bundles removed)';

COMMIT;
