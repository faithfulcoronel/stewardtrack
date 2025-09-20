-- Drop existing policies
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON roles;
DROP POLICY IF EXISTS "Roles can be managed by admins" ON roles;
DROP POLICY IF EXISTS "User roles are viewable by authenticated users" ON user_roles;
DROP POLICY IF EXISTS "User roles can be managed by admins" ON user_roles;
DROP POLICY IF EXISTS "Role permissions are viewable by authenticated users" ON role_permissions;
DROP POLICY IF EXISTS "Role permissions can be managed by admins" ON role_permissions;

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1 
    AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for roles table
CREATE POLICY "Roles are viewable by authenticated users"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Roles can be managed by admins"
  ON roles FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create policies for user_roles table
CREATE POLICY "User roles are viewable by authenticated users"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "User roles can be managed by admins"
  ON user_roles FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create policies for role_permissions table
CREATE POLICY "Role permissions are viewable by authenticated users"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Role permissions can be managed by admins"
  ON role_permissions FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create a function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id uuid)
RETURNS TABLE (
  permission_id uuid,
  permission_code text,
  permission_name text,
  permission_description text,
  permission_module text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.code,
    p.name,
    p.description,
    p.module
  FROM permissions p
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;