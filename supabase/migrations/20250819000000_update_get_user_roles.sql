-- Update get_user_roles_with_permissions to use menu-based permissions
DROP FUNCTION IF EXISTS get_user_roles_with_permissions(uuid);

CREATE OR REPLACE FUNCTION get_user_roles_with_permissions(target_user_id uuid)
RETURNS TABLE (
  role_id uuid,
  role_name text,
  role_description text,
  permissions jsonb
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Check if user has admin role or user.view permission
  IF NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN role_menu_items rmi ON r.id = rmi.role_id
    LEFT JOIN menu_permissions mp ON mp.menu_item_id = rmi.menu_item_id
      AND (mp.tenant_id = rmi.tenant_id OR (mp.tenant_id IS NULL AND rmi.tenant_id IS NULL))
    LEFT JOIN permissions p ON p.id = mp.permission_id
      AND (p.tenant_id = mp.tenant_id OR (p.tenant_id IS NULL AND mp.tenant_id IS NULL))
    WHERE ur.user_id = auth.uid()
      AND (r.name = 'admin' OR p.code = 'user.view')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.description,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'code', p.code,
          'name', p.name,
          'description', p.description,
          'module', p.module
        )
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) AS permissions
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  LEFT JOIN role_menu_items rmi ON r.id = rmi.role_id
  LEFT JOIN menu_permissions mp ON mp.menu_item_id = rmi.menu_item_id
    AND (mp.tenant_id = rmi.tenant_id OR (mp.tenant_id IS NULL AND rmi.tenant_id IS NULL))
  LEFT JOIN permissions p ON p.id = mp.permission_id
    AND (p.tenant_id = mp.tenant_id OR (p.tenant_id IS NULL AND mp.tenant_id IS NULL))
  WHERE ur.user_id = target_user_id
  GROUP BY r.id, r.name, r.description;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_roles_with_permissions(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_roles_with_permissions(uuid) IS 'Returns all roles and their permissions for a given user';
