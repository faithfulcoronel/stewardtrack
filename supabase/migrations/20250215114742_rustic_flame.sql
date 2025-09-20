-- Create function to get users by tenant
CREATE OR REPLACE FUNCTION get_tenant_users(p_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
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
  -- Check if user has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND admin_role IN ('super_admin', 'tenant_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    u.raw_app_meta_data
  FROM auth.users u
  JOIN tenant_users tu ON u.id = tu.user_id
  WHERE tu.tenant_id = p_tenant_id;
END;
$$;

-- Create function to get user details by ID with tenant check
CREATE OR REPLACE FUNCTION get_tenant_user(p_tenant_id uuid, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
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
  -- Check if user has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND admin_role IN ('super_admin', 'tenant_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    u.raw_app_meta_data
  FROM auth.users u
  JOIN tenant_users tu ON u.id = tu.user_id
  WHERE tu.tenant_id = p_tenant_id
  AND u.id = p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_tenant_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_user(uuid, uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_tenant_users(uuid) IS
  'Returns all users belonging to a specific tenant. Requires tenant admin or super admin role.';

COMMENT ON FUNCTION get_tenant_user(uuid, uuid) IS
  'Returns details for a specific user in a tenant. Requires tenant admin or super admin role.';