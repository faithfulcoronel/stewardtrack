/*
  # Add Tenant Storage and Functions

  1. Storage
    - Create tenant logos bucket
    - Add storage policies for secure logo management
  
  2. Functions
    - Add function to get current tenant
    - Add function to manage tenant invitations
*/

-- Create storage bucket for tenant logos if it doesn't exist
DO $$ 
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('tenant-logos', 'tenant-logos', true)
  ON CONFLICT (id) DO NOTHING;

  -- Create storage policies for tenant logos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Tenant logos are publicly accessible'
  ) THEN
    CREATE POLICY "Tenant logos are publicly accessible"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'tenant-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Tenant admins can upload logos'
  ) THEN
    CREATE POLICY "Tenant admins can upload logos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'tenant-logos' AND
        EXISTS (
          SELECT 1 FROM tenant_users
          WHERE tenant_id = (storage.foldername(name))[1]::uuid
          AND user_id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Tenant admins can update logos'
  ) THEN
    CREATE POLICY "Tenant admins can update logos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'tenant-logos' AND
        EXISTS (
          SELECT 1 FROM tenant_users
          WHERE tenant_id = (storage.foldername(name))[1]::uuid
          AND user_id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Tenant admins can delete logos'
  ) THEN
    CREATE POLICY "Tenant admins can delete logos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'tenant-logos' AND
        EXISTS (
          SELECT 1 FROM tenant_users
          WHERE tenant_id = (storage.foldername(name))[1]::uuid
          AND user_id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Create function to get enum values
CREATE OR REPLACE FUNCTION get_enum_values(enum_name text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enum_values text[];
BEGIN
  -- Get enum values using information schema
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO enum_values
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  WHERE t.typname = enum_name;

  RETURN enum_values;
END;
$$;

-- Create function to get current church
CREATE OR REPLACE FUNCTION get_current_church()
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  contact_number text,
  email text,
  website text,
  logo_url text,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.address,
    c.contact_number,
    c.email,
    c.website,
    c.logo_url,
    c.created_at,
    c.updated_at
  FROM churches c
  WHERE c.created_by = auth.uid()
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_enum_values(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_church() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_enum_values(text) IS 
  'Returns all values for a given enum type name';

COMMENT ON FUNCTION get_current_church() IS
  'Returns the church associated with the current user';