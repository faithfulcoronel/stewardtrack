-- ============================================================================
-- Migration: Create storage bucket for schedule cover photos
-- ============================================================================
-- Creates the schedule-covers storage bucket with RLS policies
-- ============================================================================

BEGIN;

-- Create the storage bucket for schedule cover photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'schedule-covers',
  'schedule-covers',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for the storage bucket
-- Allow authenticated users to upload to their tenant's folder
DROP POLICY IF EXISTS "Users can upload schedule covers" ON storage.objects;
CREATE POLICY "Users can upload schedule covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'schedule-covers'
);

-- Allow authenticated users to update their uploads
DROP POLICY IF EXISTS "Users can update schedule covers" ON storage.objects;
CREATE POLICY "Users can update schedule covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'schedule-covers')
WITH CHECK (bucket_id = 'schedule-covers');

-- Allow authenticated users to delete their uploads
DROP POLICY IF EXISTS "Users can delete schedule covers" ON storage.objects;
CREATE POLICY "Users can delete schedule covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'schedule-covers');

-- Allow public read access to schedule covers
DROP POLICY IF EXISTS "Public can view schedule covers" ON storage.objects;
CREATE POLICY "Public can view schedule covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'schedule-covers');

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Created schedule-covers storage bucket with RLS policies';
END $$;
