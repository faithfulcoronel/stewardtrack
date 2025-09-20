-- Drop existing problematic policies
DROP POLICY IF EXISTS "Tenant users are viewable by tenant members" ON tenant_users;
DROP POLICY IF EXISTS "Tenant users can be managed by tenant admins" ON tenant_users;
DROP POLICY IF EXISTS "Members are viewable by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members;
DROP POLICY IF EXISTS "Financial transactions are viewable by tenant users" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions can be managed by tenant users" ON financial_transactions;
DROP POLICY IF EXISTS "Budgets are viewable by tenant users" ON budgets;
DROP POLICY IF EXISTS "Budgets can be managed by tenant users" ON budgets;

-- Create materialized view for user tenant access
CREATE MATERIALIZED VIEW user_tenant_access AS
SELECT DISTINCT
  user_id,
  tenant_id,
  bool_or(role = 'admin') as is_admin
FROM tenant_users
GROUP BY user_id, tenant_id;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_user_tenant_access ON user_tenant_access(user_id, tenant_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_tenant_access()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_tenant_access;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh materialized view
CREATE TRIGGER refresh_user_tenant_access
AFTER INSERT OR UPDATE OR DELETE ON tenant_users
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_tenant_access();

-- Create improved RLS policies using materialized view
CREATE POLICY "Tenant users are viewable by tenant members"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = tenant_users.tenant_id
    )
  );

CREATE POLICY "Tenant users can be managed by tenant admins"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = tenant_users.tenant_id
      AND is_admin = true
    )
  );

-- Create improved policies for members
CREATE POLICY "Members are viewable by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = members.tenant_id
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be managed by tenant users"
  ON members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = members.tenant_id
    )
    AND deleted_at IS NULL
  );

-- Create improved policies for financial transactions
CREATE POLICY "Financial transactions are viewable by tenant users"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = financial_transactions.tenant_id
    )
  );

CREATE POLICY "Financial transactions can be managed by tenant users"
  ON financial_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = financial_transactions.tenant_id
    )
  );

-- Create improved policies for budgets
CREATE POLICY "Budgets are viewable by tenant users"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = budgets.tenant_id
    )
  );

CREATE POLICY "Budgets can be managed by tenant users"
  ON budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = budgets.tenant_id
    )
  );

-- Add helpful comments
COMMENT ON MATERIALIZED VIEW user_tenant_access IS
  'Cached view of user tenant access rights to improve policy performance';

COMMENT ON FUNCTION refresh_user_tenant_access() IS
  'Function to refresh the user tenant access materialized view';

COMMENT ON TRIGGER refresh_user_tenant_access ON tenant_users IS
  'Trigger to automatically refresh user tenant access view when tenant users change';