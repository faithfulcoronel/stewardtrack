-- =============================================================================
-- Fix generate_invitation_token function to use compatible encoding
-- =============================================================================
-- Description: The base64url encoding is not supported in standard PostgreSQL.
-- This migration updates the function to use base64 encoding and convert to
-- URL-safe format by replacing + with -, / with _, and removing = padding.
--
-- Date: 2026-01-21
-- =============================================================================

BEGIN;

-- Drop and recreate the function with compatible encoding
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
DECLARE
  v_raw_token text;
BEGIN
  -- Generate 32 random bytes and encode as base64
  v_raw_token := encode(gen_random_bytes(32), 'base64');

  -- Convert base64 to base64url format:
  -- Replace + with -
  -- Replace / with _
  -- Remove = padding
  v_raw_token := replace(v_raw_token, '+', '-');
  v_raw_token := replace(v_raw_token, '/', '_');
  v_raw_token := replace(v_raw_token, '=', '');

  RETURN v_raw_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_invitation_token() IS 'Generates a cryptographically secure URL-safe token for member invitations';

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: generate_invitation_token now uses compatible base64 to base64url conversion';
END $$;
