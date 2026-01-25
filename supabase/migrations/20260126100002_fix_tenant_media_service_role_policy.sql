-- ============================================================================
-- Migration: Fix tenant_media service role RLS policy
-- ============================================================================
-- Description: Ensures the service role can access tenant_media table
-- The previous policy using TO service_role may not work correctly.
-- This migration uses auth.role() = 'service_role' check instead.
-- ============================================================================

BEGIN;

-- Drop existing service role policy if it exists
DROP POLICY IF EXISTS "tenant_media_service_role" ON public.tenant_media;

-- Create service role bypass policy using auth.role() check
CREATE POLICY "tenant_media_service_role" ON public.tenant_media
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- Success confirmation
DO $$
BEGIN
    RAISE NOTICE 'Fixed tenant_media service role RLS policy';
END $$;
