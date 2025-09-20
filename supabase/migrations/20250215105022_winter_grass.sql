-- Drop existing function first
DROP FUNCTION IF EXISTS get_current_tenant();

-- Drop existing storage policies
DROP POLICY IF EXISTS "Tenant logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can delete logos" ON storage.objects;

-- Create improved storage policies for tenant logos
CREATE POLICY "Tenant logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');

CREATE POLICY "Tenant admins can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-logos' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Tenant admins can update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tenant-logos' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Tenant admins can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tenant-logos' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text
      FROM tenant_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to get current tenant with proper profile picture URL
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TABLE (
  id uuid,
  name text,
  subdomain text,
  address text,
  contact_number text,
  email text,
  website text,
  profile_picture_url text,
  status text,
  subscription_tier text,
  subscription_status text,
  subscription_end_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_record tenants%ROWTYPE;
BEGIN
  -- Get tenant record
  SELECT t.* INTO tenant_record
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT 
      tenant_record.id,
      tenant_record.name,
      tenant_record.subdomain,
      tenant_record.address,
      tenant_record.contact_number,
      tenant_record.email,
      tenant_record.website,
      tenant_record.profile_picture_url,
      tenant_record.status,
      tenant_record.subscription_tier,
      tenant_record.subscription_status,
      tenant_record.subscription_end_date,
      tenant_record.created_at,
      tenant_record.updated_at;
  END IF;
END;
$$;