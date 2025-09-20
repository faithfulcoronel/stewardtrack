-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be updated by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be deleted by tenant users" ON members;

DROP POLICY IF EXISTS "Members can be inserted by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be updated by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be deleted by authenticated users" ON members;

-- Create new RLS policies for members
DROP POLICY IF EXISTS "Members are viewable only by tenant users" ON members;
CREATE POLICY "Members are viewable only by tenant users"
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


CREATE POLICY "Members can be created only within the user's tenant"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1)
  );


CREATE POLICY "Members can be updated by users in the same tenant"
  ON members FOR UPDATE
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
    AND deleted_at IS NULL
  );


CREATE POLICY "Members can be deleted by users in the same tenant"
  ON members FOR DELETE
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
    AND deleted_at IS NULL
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
