-- Create function to get user's current tenant ID
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tenant_id uuid;
BEGIN
  -- Get the user's tenant ID
  SELECT tu.tenant_id INTO tenant_id
  FROM tenant_users tu
  WHERE tu.user_id = auth.uid()
  AND tu.admin_role != 'super_admin'
  LIMIT 1;
  
  RETURN tenant_id;
END;
$$;

-- Create function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(check_tenant_id uuid)
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
      tenant_id = check_tenant_id
      OR admin_role = 'super_admin'
    )
  );
END;
$$;

-- Create function to get all accessible tenants for user
CREATE OR REPLACE FUNCTION get_user_accessible_tenants()
RETURNS TABLE (tenant_id uuid)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT tu.tenant_id
  FROM tenant_users tu
  WHERE tu.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM tenant_users tu2
    WHERE tu2.user_id = auth.uid()
    AND tu2.admin_role = 'super_admin'
  );
END;
$$;

-- Update RLS policies to use tenant isolation
DROP POLICY IF EXISTS "Members are viewable by tenant users" ON members;
CREATE POLICY "Members are viewable by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    user_belongs_to_tenant(tenant_id)
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members;
CREATE POLICY "Members can be managed by tenant users"
  ON members FOR ALL
  TO authenticated
  USING (
    user_belongs_to_tenant(tenant_id)
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Financial transactions are viewable by tenant users" ON financial_transactions;
CREATE POLICY "Financial transactions are viewable by tenant users"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    user_belongs_to_tenant(tenant_id)
  );

DROP POLICY IF EXISTS "Financial transactions can be managed by tenant users" ON financial_transactions;
CREATE POLICY "Financial transactions can be managed by tenant users"
  ON financial_transactions FOR ALL
  TO authenticated
  USING (
    user_belongs_to_tenant(tenant_id)
  );

DROP POLICY IF EXISTS "Budgets are viewable by tenant users" ON budgets;
CREATE POLICY "Budgets are viewable by tenant users"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    user_belongs_to_tenant(tenant_id)
  );

DROP POLICY IF EXISTS "Budgets can be managed by tenant users" ON budgets;
CREATE POLICY "Budgets can be managed by tenant users"
  ON budgets FOR ALL
  TO authenticated
  USING (
    user_belongs_to_tenant(tenant_id)
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_tenant ON tenant_users(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_role ON tenant_users(user_id, admin_role);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_belongs_to_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_tenants() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_user_tenant_id() IS
  'Returns the current tenant ID for a user, ignoring super admin access';

COMMENT ON FUNCTION user_belongs_to_tenant(uuid) IS
  'Checks if a user belongs to a specific tenant or is a super admin';

COMMENT ON FUNCTION get_user_accessible_tenants() IS
  'Returns all tenant IDs accessible to the current user';