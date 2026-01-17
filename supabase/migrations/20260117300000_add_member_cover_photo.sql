-- Add cover_photo_url column to members table for profile cover photos
ALTER TABLE members
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN members.cover_photo_url IS 'URL to the member''s profile cover photo stored in Supabase Storage';
