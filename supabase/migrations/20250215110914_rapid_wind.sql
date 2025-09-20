-- Drop existing storage policies
DROP POLICY IF EXISTS "Tenant logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can delete logos" ON storage.objects;

-- Drop existing function
DROP FUNCTION IF EXISTS get_current_tenant();

-- Drop existing RLS policies for tenants
DROP POLICY IF EXISTS "Tenants are viewable by their members" ON tenants;
DROP POLICY IF EXISTS "Tenants can be created by authenticated users" ON tenants;
DROP POLICY IF EXISTS "Tenants can be updated by admin users" ON tenants;

-- Create improved RLS policies for tenants
CREATE POLICY "Tenants are viewable by their members"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
      AND tenant_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can be created by authenticated users"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tenants can be updated by tenant admins"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

-- Create improved storage policies for tenant logos
CREATE POLICY "Tenant logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');

CREATE POLICY "Tenant admins can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-logos' AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id::text = (storage.foldername(name))[1]
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

CREATE POLICY "Tenant admins can update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tenant-logos' AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id::text = (storage.foldername(name))[1]
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

CREATE POLICY "Tenant admins can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tenant-logos' AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id::text = (storage.foldername(name))[1]
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

-- Create function to get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS SETOF tenants
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_current_tenant() IS
  'Returns the tenant (church) associated with the current user';