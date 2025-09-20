-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable only by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be created only within the user's tenant" ON members;
DROP POLICY IF EXISTS "Members can be updated by users in the same tenant" ON members;
DROP POLICY IF EXISTS "Members can be deleted by users in the same tenant" ON members;

-- Create optimized RLS policies for members

-- 🔹 Restrict viewing to tenant users
CREATE POLICY "Members are viewable only by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
    AND deleted_at IS NULL
  );

-- 🔹 Allow only tenant users to create members within their own tenant
CREATE POLICY "Members can be created only within the user's tenant"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    check_tenant_access(tenant_id)
  );

-- 🔹 Allow only tenant users to update members within their tenant
CREATE POLICY "Members can be updated by users in the same tenant"
  ON members FOR UPDATE
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
    AND deleted_at IS NULL
  );

-- 🔹 Allow only tenant users to delete members within their tenant
CREATE POLICY "Members can be deleted by users in the same tenant"
  ON members FOR DELETE
  TO authenticated
  USING (
    check_tenant_access(tenant_id)
    AND deleted_at IS NULL
  );

-- Add comments for clarity
COMMENT ON POLICY "Members are viewable only by tenant users" ON members IS
  'Users can only view members within their tenant';

COMMENT ON POLICY "Members can be created only within the user's tenant" ON members IS
  'Users can only create members within their own tenant';

COMMENT ON POLICY "Members can be updated by users in the same tenant" ON members IS
  'Users can only update members within their tenant';

COMMENT ON POLICY "Members can be deleted by users in the same tenant" ON members IS
  'Users can only delete members within their tenant';
