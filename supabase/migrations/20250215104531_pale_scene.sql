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
          WHERE tenant_id::text = (storage.foldername(name))[1]
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
          WHERE tenant_id::text = (storage.foldername(name))[1]
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
          WHERE tenant_id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END $$;