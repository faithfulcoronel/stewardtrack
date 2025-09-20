-- Drop existing problematic policies
DROP POLICY IF EXISTS "Tenant users are viewable by tenant members" ON tenant_users;
DROP POLICY IF EXISTS "Tenant users can be managed by tenant admins" ON tenant_users;

-- Create improved RLS policies for tenant_users
CREATE POLICY "Tenant users are viewable by tenant members"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant users can be managed by tenant admins"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role = 'admin'
    )
  );

-- Create indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_role ON tenant_users(tenant_id, role);

-- Add helpful comments
COMMENT ON POLICY "Tenant users are viewable by tenant members" ON tenant_users IS
  'Users can view other users in the same tenant';

COMMENT ON POLICY "Tenant users can be managed by tenant admins" ON tenant_users IS
  'Only tenant admins can manage users in their tenant';