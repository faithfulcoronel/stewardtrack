-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be created by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be updated by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be deleted by authenticated users" ON members;

-- Create function to get user's current tenant ID
CREATE OR REPLACE FUNCTION get_user_current_tenant_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tenant_id uuid;
BEGIN
  SELECT t.id INTO tenant_id
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;  -- Ensure the user is only associated with one tenant
  RETURN tenant_id;
END;
$$;

-- Create simplified RLS policies for members
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_current_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be created by authenticated users"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_current_tenant_id()
  );

CREATE POLICY "Members can be updated by authenticated users"
  ON members FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_current_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be deleted by authenticated users"
  ON members FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_current_tenant_id()
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_current_tenant_id() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_user_current_tenant_id IS
  'Returns the current tenant ID for the authenticated user';

COMMENT ON POLICY "Members are viewable by authenticated users" ON members IS
  'Authenticated users can view members within their tenant';

COMMENT ON POLICY "Members can be created by authenticated users" ON members IS
  'Authenticated users can create members within their tenant';

COMMENT ON POLICY "Members can be updated by authenticated users" ON members IS
  'Authenticated users can update members within their tenant';

COMMENT ON POLICY "Members can be deleted by authenticated users" ON members IS
  'Authenticated users can delete members within their tenant';
