-- ============================================================================
-- Migration: Add cover photo support to ministry_schedules
-- ============================================================================
-- Adds cover_photo_url column to ministry_schedules table for event cover images
-- ============================================================================

BEGIN;

-- Add cover_photo_url column to ministry_schedules
ALTER TABLE public.ministry_schedules
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Add comment
COMMENT ON COLUMN public.ministry_schedules.cover_photo_url IS 'URL to the cover photo image stored in Supabase Storage';

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Added cover_photo_url column to ministry_schedules table';
END $$;
