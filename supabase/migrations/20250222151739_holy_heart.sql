-- Drop existing storage policies
DROP POLICY IF EXISTS "Profile pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile pictures" ON storage.objects;

-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Create improved storage policies for profile pictures with explicit tenant access check
CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload profile pictures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profiles' AND
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id::text = (storage.foldername(name))[1]
      AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update profile pictures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profiles' AND
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id::text = (storage.foldername(name))[1]
      AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete profile pictures"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profiles' AND
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id::text = (storage.foldername(name))[1]
      AND tu.user_id = auth.uid()
    )
  );