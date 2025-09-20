-- Drop existing trigger first
DROP TRIGGER IF EXISTS assign_user_roles ON auth.users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user_registration ON auth.users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_new_user_role() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_registration() CASCADE;
DROP FUNCTION IF EXISTS get_current_tenant() CASCADE;

-- Create or replace function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id uuid;
  member_role_id uuid;
  user_count int;
  current_user_id uuid;
  default_tenant_id uuid;
BEGIN
  -- Get the member role ID first
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  IF member_role_id IS NULL THEN
    RAISE EXCEPTION 'Member role not found';
  END IF;

  -- Get the admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found';
  END IF;

  -- Get the total number of users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- Set current_user_id to the new user's ID
  current_user_id := NEW.id;

  -- If this is the first user, create a default tenant
  IF user_count = 1 THEN
    INSERT INTO tenants (
      name,
      subdomain,
      status,
      subscription_tier,
      subscription_status,
      created_by
    ) VALUES (
      'Default Church',
      'default',
      'active',
      'free',
      'active',
      current_user_id
    ) RETURNING id INTO default_tenant_id;

    -- Create tenant_user relationship with admin role
    INSERT INTO tenant_users (
      tenant_id,
      user_id,
      role,
      created_by
    ) VALUES (
      default_tenant_id,
      current_user_id,
      'admin',
      current_user_id
    );

    -- Assign admin role
    INSERT INTO user_roles (user_id, role_id, created_by)
    VALUES (current_user_id, admin_role_id, current_user_id);
  END IF;
  
  -- Always assign member role to new users
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (current_user_id, member_role_id, current_user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in handle_new_user_registration: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER handle_new_user_registration
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_registration();

-- Create function to get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS SETOF tenants
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;
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
  -- Check if user has admin role or user.view permission
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND (r.name = 'admin' OR p.code = 'user.view')
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles_with_permissions(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_current_tenant() IS
  'Returns the tenant (church) associated with the current user';

COMMENT ON FUNCTION get_user_roles_with_permissions(uuid) IS
  'Returns all roles and their permissions for a given user';

COMMENT ON FUNCTION handle_new_user_registration() IS
  'Handles new user registration by assigning roles and creating default tenant for first user';