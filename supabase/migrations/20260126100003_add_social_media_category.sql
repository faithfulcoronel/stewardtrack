-- ============================================================================
-- Migration: Add social_media to media_category enum
-- ============================================================================
-- Description: Adds 'social_media' as a valid value for the media_category enum
-- This enables tracking of media uploaded for social media posts (Facebook, etc.)
-- ============================================================================

BEGIN;

-- Add 'social_media' to media_category enum
-- PostgreSQL allows adding values to an existing enum
ALTER TYPE media_category ADD VALUE IF NOT EXISTS 'social_media';

COMMIT;

-- Success confirmation
DO $$
BEGIN
    RAISE NOTICE 'Added social_media to media_category enum successfully';
END $$;
