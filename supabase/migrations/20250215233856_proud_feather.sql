-- Drop existing function
DROP FUNCTION IF EXISTS get_current_tenant();

-- Create improved function to get current tenant with explicit table references
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS SETOF tenants
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  AND tu.admin_role != 'super_admin'
  ORDER BY t.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_current_tenant() IS
  'Returns the tenant (church) associated with the current user with explicit table references to avoid ambiguity';