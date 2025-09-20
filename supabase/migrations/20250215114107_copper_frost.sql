-- Create improved function to get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS SETOF tenants
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_tenant_id uuid;
BEGIN
  -- Get current tenant ID
  SELECT t.id INTO current_tenant_id
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;

  RETURN QUERY
  SELECT t.*
  FROM tenants t
  WHERE t.id = current_tenant_id;
END;
$$;

-- Create function to get tenant ID for current user
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tenant_id uuid;
BEGIN
  SELECT t.id INTO tenant_id
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;
  
  RETURN tenant_id;
END;
$$;

-- Update RLS policies to use explicit table references
DROP POLICY IF EXISTS "Members are viewable by tenant users" ON members;
CREATE POLICY "Members are viewable by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    members.tenant_id = get_current_tenant_id()
    AND members.deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members;
CREATE POLICY "Members can be managed by tenant users"
  ON members FOR ALL
  TO authenticated
  USING (
    members.tenant_id = get_current_tenant_id()
    AND members.deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Financial transactions are viewable by tenant users" ON financial_transactions;
CREATE POLICY "Financial transactions are viewable by tenant users"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    financial_transactions.tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Financial transactions can be managed by tenant users" ON financial_transactions;
CREATE POLICY "Financial transactions can be managed by tenant users"
  ON financial_transactions FOR ALL
  TO authenticated
  USING (
    financial_transactions.tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Budgets are viewable by tenant users" ON budgets;
CREATE POLICY "Budgets are viewable by tenant users"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    budgets.tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Budgets can be managed by tenant users" ON budgets;
CREATE POLICY "Budgets can be managed by tenant users"
  ON budgets FOR ALL
  TO authenticated
  USING (
    budgets.tenant_id = get_current_tenant_id()
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_current_tenant() IS
  'Returns the tenant (church) associated with the current user';

COMMENT ON FUNCTION get_current_tenant_id() IS
  'Returns the ID of the tenant associated with the current user';