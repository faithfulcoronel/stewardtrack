-- Drop existing storage policies
DROP POLICY IF EXISTS "Logo images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their logos" ON storage.objects;

-- Create improved storage policies for logos
CREATE POLICY "Logo images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Users can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = (
      SELECT c.id::text
      FROM churches c
      WHERE c.created_by = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can update their logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = (
      SELECT c.id::text
      FROM churches c
      WHERE c.created_by = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can delete their logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = (
      SELECT c.id::text
      FROM churches c
      WHERE c.created_by = auth.uid()
      LIMIT 1
    )
  );