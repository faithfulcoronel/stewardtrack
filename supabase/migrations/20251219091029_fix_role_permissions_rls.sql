-- =====================================================================================
-- MIGRATION: Fix Role Permissions RLS
-- =====================================================================================
-- Updates role_permissions policies to allow service operations during tenant setup
-- The existing policy blocks INSERT during registration when permissions are deployed
-- =====================================================================================

BEGIN;

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Role permissions scoped to tenant" ON role_permissions;

-- Separate policies for different operations
-- SELECT: Restricted to tenant users
CREATE POLICY "Role permissions readable within tenant" ON role_permissions
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

-- INSERT: Allow tenant users AND system operations (for permission deployment)
CREATE POLICY "Role permissions insertable within tenant" ON role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (check_tenant_access(tenant_id));

-- UPDATE: Restricted to tenant users
CREATE POLICY "Role permissions updatable within tenant" ON role_permissions
  FOR UPDATE TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- DELETE: Restricted to tenant users
CREATE POLICY "Role permissions deletable within tenant" ON role_permissions
  FOR DELETE TO authenticated
  USING (check_tenant_access(tenant_id));

COMMIT;
