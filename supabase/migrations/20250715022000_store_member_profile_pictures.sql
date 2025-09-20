-- Adjust profile picture storage policies to allow storing per member
-- Drop previous policies
DROP POLICY IF EXISTS "Profile pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile pictures" ON storage.objects;

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone in the tenant to access member pictures
CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload profile pictures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profiles' AND
    (storage.foldername(name))[1] IN (
      SELECT tu.tenant_id::text FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update profile pictures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profiles' AND
    (storage.foldername(name))[1] IN (
      SELECT tu.tenant_id::text FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete profile pictures"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profiles' AND
    (storage.foldername(name))[1] IN (
      SELECT tu.tenant_id::text FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

