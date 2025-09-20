-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable only by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be created only within the user's tenant" ON members;
DROP POLICY IF EXISTS "Members can be updated by users in the same tenant" ON members;
DROP POLICY IF EXISTS "Members can be deleted by users in the same tenant" ON members;

-- Create improved RLS policies for members with explicit table references
CREATE POLICY "Members are viewable only by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = members.tenant_id
      AND tu.user_id = auth.uid()
    )
    AND members.deleted_at IS NULL
  );

CREATE POLICY "Members can be created only within the user's tenant"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    members.tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can be updated by users in the same tenant"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = members.tenant_id
      AND tu.user_id = auth.uid()
    )
    AND members.deleted_at IS NULL
  );

CREATE POLICY "Members can be deleted by users in the same tenant"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = members.tenant_id
      AND tu.user_id = auth.uid()
    )
  AND members.deleted_at IS NULL -- Prevent deleting already deleted members
  );

-- Add helpful comments
COMMENT ON POLICY "Members are viewable only by tenant users" ON members IS
  'Users can only view members within their tenant';

COMMENT ON POLICY "Members can be created only within the user's tenant" ON members IS
  'Users can only create members within their own tenant';

COMMENT ON POLICY "Members can be updated by users in the same tenant" ON members IS
  'Users can only update members within their tenant';

COMMENT ON POLICY "Members can be deleted by users in the same tenant" ON members IS
  'Users can only delete members within their tenant';