-- =============================================================================
-- Migration: Qualify tenant column usage in RLS policies to prevent ambiguity
-- =============================================================================

BEGIN;

-- Drop dependent policies before recreating the helper function with a new signature
DROP POLICY IF EXISTS "Tenants are viewable by users with access" ON tenants;
DROP POLICY IF EXISTS "Tenants can be created by super admins or first user" ON tenants;
DROP POLICY IF EXISTS "Tenants can be updated by admins" ON tenants;
DROP POLICY IF EXISTS "Tenant users are viewable by tenant members" ON tenant_users;
DROP POLICY IF EXISTS "Tenant users can be managed by admins" ON tenant_users;

-- Remove the prior definition so we can introduce an explicitly named parameter
DROP FUNCTION IF EXISTS has_tenant_access(uuid);

-- Recreate helper function with explicit parameter naming for clarity
CREATE FUNCTION has_tenant_access(p_tenant_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
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

-- Recreate tenant policies to restore previous behaviour
CREATE POLICY "Tenants are viewable by users with access"
  ON tenants FOR SELECT
  TO authenticated
  USING (has_tenant_access(id));

CREATE POLICY "Tenants can be created by super admins or first user"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_admin_role() = 'super_admin'
    OR NOT EXISTS (SELECT 1 FROM tenants)
  );

CREATE POLICY "Tenants can be updated by admins"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    get_user_admin_role() IN ('super_admin', 'tenant_admin')
    AND has_tenant_access(id)
  );

-- Recreate tenant_users policies with fully-qualified tenant_id references
CREATE POLICY "Tenant users are viewable by tenant members"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    has_tenant_access(tenant_users.tenant_id)
  );

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
