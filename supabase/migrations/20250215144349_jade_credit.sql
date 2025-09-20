-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_tenant_users(uuid);

-- Create improved function to get users by tenant with correct types
CREATE OR REPLACE FUNCTION get_tenant_users(p_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  email varchar(255),
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb
)
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Check if user has access to tenant and proper permissions
  IF NOT EXISTS (
    SELECT 1 
    FROM tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
    AND tu.user_id = auth.uid()
    AND (
      -- Allow access if user is super admin
      tu.admin_role = 'super_admin'
      OR
      -- Allow access if user is tenant admin for this tenant
      (tu.admin_role = 'tenant_admin' AND tu.tenant_id = p_tenant_id)
      OR
      -- Allow access if user has user.view permission
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()
        AND p.code = 'user.view'
      )
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    u.id,
    u.email::varchar(255),
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    u.raw_app_meta_data
  FROM auth.users u
  JOIN tenant_users tu ON u.id = tu.user_id
  WHERE tu.tenant_id = p_tenant_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_tenant_users(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_tenant_users(uuid) IS 
  'Returns all users belonging to a specific tenant. Requires tenant admin, super admin role, or user.view permission.';