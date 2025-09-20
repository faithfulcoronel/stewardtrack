-- Drop existing function first
DROP FUNCTION IF EXISTS get_user_roles_with_permissions(uuid);

-- Create helper function to get user roles with permissions
CREATE OR REPLACE FUNCTION get_user_roles_with_permissions(target_user_id uuid)
RETURNS TABLE (
  role_id uuid,
  role_name text,
  role_description text,
  permissions jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin or has user.view permission
  IF NOT (SELECT is_admin()) AND NOT EXISTS (
    SELECT 1 FROM user_roles ur2
    JOIN role_permissions rp ON ur2.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur2.user_id = auth.uid() AND p.code = 'user.view'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
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
    ) as permissions
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = target_user_id
  GROUP BY r.id, r.name, r.description;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_roles_with_permissions(uuid) TO authenticated;