-- Add facebook_post_data column to communication_campaigns table
-- This stores Facebook-specific post content (text, media URL, media type, link URL)

ALTER TABLE communication_campaigns
ADD COLUMN IF NOT EXISTS facebook_post_data JSONB;

COMMENT ON COLUMN communication_campaigns.facebook_post_data IS 'Facebook-specific post data including text, mediaUrl, mediaType, and linkUrl';
