-- =============================================================================
-- Migration: Drop duplicate get_public_product_offerings function
-- =============================================================================
-- There are two versions of the function causing ambiguity:
-- 1. 4-param version (boolean, boolean, text, uuid)
-- 2. 5-param version (boolean, boolean, text, uuid, varchar)
--
-- This migration drops the 5-param version to resolve the ambiguity.
-- =============================================================================

BEGIN;

-- Drop the 5-parameter version that's causing ambiguity
DROP FUNCTION IF EXISTS public.get_public_product_offerings(boolean, boolean, text, uuid, varchar);
DROP FUNCTION IF EXISTS public.get_public_product_offerings(boolean, boolean, text, uuid, text);

COMMIT;
