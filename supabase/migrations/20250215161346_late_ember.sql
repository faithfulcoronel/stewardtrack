-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_tenant_access CASCADE;

-- Drop existing functions that might depend on the view
DROP FUNCTION IF EXISTS refresh_user_tenant_access() CASCADE;

-- Create improved function to get tenant users
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

-- Create function to check tenant access
CREATE OR REPLACE FUNCTION check_tenant_access(p_tenant_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
    AND tu.user_id = auth.uid()
    AND (
      tu.admin_role = 'super_admin'
      OR tu.admin_role = 'tenant_admin'
      OR tu.tenant_id = p_tenant_id
    )
  );
END;
$$;

-- Update RLS policies to use the new check_tenant_access function
DROP POLICY IF EXISTS "Members are viewable by tenant users" ON members;
CREATE POLICY "Members are viewable by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members;
CREATE POLICY "Members can be managed by tenant users"
  ON members FOR ALL
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Financial transactions are viewable by tenant users" ON financial_transactions;
CREATE POLICY "Financial transactions are viewable by tenant users"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS "Financial transactions can be managed by tenant users" ON financial_transactions;
CREATE POLICY "Financial transactions can be managed by tenant users"
  ON financial_transactions FOR ALL
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS "Budgets are viewable by tenant users" ON budgets;
CREATE POLICY "Budgets are viewable by tenant users"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

DROP POLICY IF EXISTS "Budgets can be managed by tenant users" ON budgets;
CREATE POLICY "Budgets can be managed by tenant users"
  ON budgets FOR ALL
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_tenant_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_tenant_access(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_tenant_users(uuid) IS 
  'Returns all users belonging to a specific tenant. Requires tenant admin, super admin role, or user.view permission.';

COMMENT ON FUNCTION check_tenant_access(uuid) IS
  'Checks if the current user has access to the specified tenant.';