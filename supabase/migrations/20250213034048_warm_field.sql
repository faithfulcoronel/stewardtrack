-- Drop existing trigger first
DROP TRIGGER IF EXISTS assign_user_roles ON auth.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_roles_with_permissions(uuid);
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS handle_new_user_role();

-- Create improved is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
  );
END;
$$;

-- Create function to get user roles with permissions
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
AS $$
BEGIN
  -- Check if user is admin or has user.view permission
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND (
      r.name = 'admin'
      OR EXISTS (
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = r.id
        AND p.code = 'user.view'
      )
    )
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

-- Create function to handle new user role assignment
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id uuid;
  member_role_id uuid;
  user_count int;
BEGIN
  -- Get the member role ID first
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  IF member_role_id IS NULL THEN
    RAISE EXCEPTION 'Member role not found';
  END IF;

  -- Get the total number of users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- If this is the first user, make them an admin
  IF user_count = 1 THEN
    -- Get the admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    IF admin_role_id IS NULL THEN
      RAISE EXCEPTION 'Admin role not found';
    END IF;
    
    -- Assign admin role to the user
    INSERT INTO user_roles (user_id, role_id, created_by)
    VALUES (NEW.id, admin_role_id, NEW.id);
  END IF;
  
  -- Always assign member role to new users
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (NEW.id, member_role_id, NEW.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in handle_new_user_role: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user role assignment
CREATE TRIGGER assign_user_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_role();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles_with_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_role() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION is_admin() IS 
  'Checks if the current user has the admin role';

COMMENT ON FUNCTION get_user_roles_with_permissions(uuid) IS 
  'Gets all roles and their permissions for a given user. Requires admin role or user.view permission.';

COMMENT ON FUNCTION handle_new_user_role() IS 
  'Automatically assigns roles to new users. First user gets admin role, all users get member role.';