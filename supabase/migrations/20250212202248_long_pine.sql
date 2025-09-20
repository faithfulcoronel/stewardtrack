/*
  # Add storage policies for profile pictures

  1. Changes
    - Add storage policies for the profiles bucket
    - Enable authenticated users to upload and manage their profile pictures
    - Make profile pictures publicly readable

  2. Security
    - Only authenticated users can upload/delete files
    - Files are publicly readable
    - Users can only modify their own files
*/

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create storage policies
DO $$
BEGIN
  -- Enable storage by default for authenticated users
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('profiles', 'profiles', true)
  ON CONFLICT (id) DO NOTHING;

  -- Allow public access to profile pictures
  CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

  -- Allow authenticated users to upload profile pictures
  CREATE POLICY "Users can upload profile pictures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Allow users to update their own profile pictures
  CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Allow users to delete their own profile pictures
  CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;