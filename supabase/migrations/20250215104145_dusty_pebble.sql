-- Add profile_picture_url column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- Add comment explaining profile picture field
COMMENT ON COLUMN tenants.profile_picture_url IS 
  'URL to the tenant''s profile picture or logo image';