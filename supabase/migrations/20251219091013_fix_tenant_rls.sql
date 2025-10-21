-- =============================================================================
-- Migration: Qualify tenant column usage in RLS policies to prevent ambiguity
-- =============================================================================

BEGIN;

-- Refresh helper function ensuring explicit argument aliasing for clarity
CREATE OR REPLACE FUNCTION has_tenant_access(tenant_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  p_tenant_id ALIAS FOR $1;
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND (
        tu.admin_role = 'super_admin'
        OR tu.tenant_id = p_tenant_id
      )
  );
END;
$$;

-- Recreate tenant_users policies with fully-qualified tenant_id references
DROP POLICY IF EXISTS "Tenant users are viewable by tenant members" ON tenant_users;
CREATE POLICY "Tenant users are viewable by tenant members"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    has_tenant_access(tenant_users.tenant_id)
  );

DROP POLICY IF EXISTS "Tenant users can be managed by admins" ON tenant_users;
CREATE POLICY "Tenant users can be managed by admins"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    get_user_admin_role() IN ('super_admin', 'tenant_admin')
    AND has_tenant_access(tenant_users.tenant_id)
  );

-- Ensure permissions and documentation remain intact
GRANT EXECUTE ON FUNCTION has_tenant_access(uuid) TO authenticated;

COMMENT ON FUNCTION has_tenant_access(uuid) IS
  'Checks if the current user has access to the specified tenant';

COMMIT;
