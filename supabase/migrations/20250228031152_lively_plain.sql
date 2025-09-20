-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members can be managed by authenticated users" ON members;

-- Create improved RLS policies for members with proper tenant isolation
CREATE POLICY "Members are viewable by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_current_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be created by tenant users"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_current_tenant_id()
  );

CREATE POLICY "Members can be updated by tenant users"
  ON members FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_current_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be deleted by tenant users"
  ON members FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_current_tenant_id()
    AND deleted_at IS NULL
  );

-- Add helpful comments
COMMENT ON POLICY "Members are viewable by tenant users" ON members IS
  'Users can only view members within their tenant';

COMMENT ON POLICY "Members can be created by tenant users" ON members IS
  'Users can only create members within their tenant';

COMMENT ON POLICY "Members can be updated by tenant users" ON members IS
  'Users can only update members within their tenant';

COMMENT ON POLICY "Members can be deleted by tenant users" ON members IS
  'Users can only delete members within their tenant';