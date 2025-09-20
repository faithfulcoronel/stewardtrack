-- Drop existing problematic policies
DROP POLICY IF EXISTS "Tenants are viewable by super admins and members" ON tenants;
DROP POLICY IF EXISTS "Tenants can be created by super admins" ON tenants;
DROP POLICY IF EXISTS "Tenants can be updated by super admins and tenant admins" ON tenants;
DROP POLICY IF EXISTS "Tenant users are viewable by tenant members" ON tenant_users;
DROP POLICY IF EXISTS "Tenant users can be managed by tenant admins" ON tenant_users;

-- Create base function to get user's admin role
CREATE OR REPLACE FUNCTION get_user_admin_role()
RETURNS admin_role_type
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_role admin_role_type;
BEGIN
  SELECT admin_role INTO user_role
  FROM tenant_users
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE admin_role
      WHEN 'super_admin' THEN 1
      WHEN 'tenant_admin' THEN 2
      WHEN 'staff' THEN 3
      WHEN 'member' THEN 4
    END
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'member'::admin_role_type);
END;
$$;

-- Create function to check user's tenant access
CREATE OR REPLACE FUNCTION has_tenant_access(tenant_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND (
      admin_role = 'super_admin'
      OR tenant_id = $1
    )
  );
END;
$$;

-- Create improved tenant policies
CREATE POLICY "Tenants are viewable by users with access"
  ON tenants FOR SELECT
  TO authenticated
  USING (has_tenant_access(id));

CREATE POLICY "Tenants can be created by super admins or first user"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_admin_role() = 'super_admin'
    OR NOT EXISTS (SELECT 1 FROM tenants)
  );

CREATE POLICY "Tenants can be updated by admins"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    get_user_admin_role() IN ('super_admin', 'tenant_admin')
    AND has_tenant_access(id)
  );

-- Create improved tenant_users policies
CREATE POLICY "Tenant users are viewable by tenant members"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    has_tenant_access(tenant_id)
  );

CREATE POLICY "Tenant users can be managed by admins"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    get_user_admin_role() IN ('super_admin', 'tenant_admin')
    AND has_tenant_access(tenant_id)
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION has_tenant_access(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_user_admin_role() IS
  'Returns the highest admin role for the current user';

COMMENT ON FUNCTION has_tenant_access(uuid) IS
  'Checks if the current user has access to the specified tenant';