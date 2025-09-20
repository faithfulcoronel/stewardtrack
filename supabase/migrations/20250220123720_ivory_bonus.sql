-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members;

-- Create improved RLS policies for members
CREATE POLICY "Members are viewable by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = members.tenant_id
      AND tu.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be managed by tenant users"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = members.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can be updated by tenant users"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = members.tenant_id
      AND tu.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be deleted by tenant users"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = members.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Members are viewable by tenant users" ON members IS
  'Users can view members in their tenant';

COMMENT ON POLICY "Members can be managed by tenant users" ON members IS
  'Users can create new members in their tenant';

COMMENT ON POLICY "Members can be updated by tenant users" ON members IS
  'Users can update members in their tenant';

COMMENT ON POLICY "Members can be deleted by tenant users" ON members IS
  'Users can delete members in their tenant';