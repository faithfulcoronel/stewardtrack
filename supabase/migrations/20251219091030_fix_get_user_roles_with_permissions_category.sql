-- =====================================================================================
-- MIGRATION: Fix get_user_roles_with_permissions - Remove category column reference
-- =====================================================================================
-- Fixes column reference error: permissions table has 'action' not 'category'
-- =====================================================================================

BEGIN;

DROP FUNCTION IF EXISTS get_user_roles_with_permissions(uuid);

CREATE OR REPLACE FUNCTION get_user_roles_with_permissions(target_user_id uuid)
RETURNS TABLE (
  role_id uuid,
  code text,
  name text,
  description text,
  permissions jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_tenant_id uuid;
BEGIN
  -- Get current user's tenant
  SELECT tenant_id INTO current_tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Return user roles with their permissions
  RETURN QUERY
  SELECT
    r.id as role_id,
    r.metadata_key as code,
    r.name as name,
    r.description as description,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'code', p.code,
          'name', p.name,
          'description', p.description,
          'module', p.module,
          'action', p.action
        ) ORDER BY p.code
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) as permissions
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.tenant_id = current_tenant_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = target_user_id
    AND ur.tenant_id = current_tenant_id
    AND r.tenant_id = current_tenant_id
  GROUP BY r.id, r.metadata_key, r.name, r.description
  ORDER BY r.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_roles_with_permissions(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_roles_with_permissions(uuid) IS
  'Returns all roles for a user along with their associated permissions. Used for RBAC checks and UI permission rendering.';

COMMIT;
