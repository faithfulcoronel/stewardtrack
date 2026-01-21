-- =============================================================================
-- Add missing columns to member_invitations table
-- =============================================================================
-- Description: The member_invitations adapter expects several columns that
-- were not included in the original table definition. This migration adds
-- the missing columns.
--
-- Missing columns:
-- - revocation_reason (renamed from revoke_reason)
-- - encrypted_fields
-- - encryption_key_version
-- - assigned_role_id
--
-- Date: 2026-01-21
-- =============================================================================

BEGIN;

-- Rename revoke_reason to revocation_reason if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member_invitations'
    AND column_name = 'revoke_reason'
  ) THEN
    ALTER TABLE member_invitations
    RENAME COLUMN revoke_reason TO revocation_reason;
    RAISE NOTICE 'Renamed revoke_reason to revocation_reason';
  END IF;
END $$;

-- Add revocation_reason if it doesn't exist (and wasn't just renamed)
ALTER TABLE member_invitations
ADD COLUMN IF NOT EXISTS revocation_reason text;

-- Add encrypted_fields column
ALTER TABLE member_invitations
ADD COLUMN IF NOT EXISTS encrypted_fields text[];

-- Add encryption_key_version column
ALTER TABLE member_invitations
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

-- Add assigned_role_id column for role pre-assignment during invitations
ALTER TABLE member_invitations
ADD COLUMN IF NOT EXISTS assigned_role_id uuid REFERENCES roles(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN member_invitations.revocation_reason IS 'Reason provided when the invitation was revoked';
COMMENT ON COLUMN member_invitations.encrypted_fields IS 'List of field names that are encrypted in this record';
COMMENT ON COLUMN member_invitations.encryption_key_version IS 'Version of the encryption key used for this record';
COMMENT ON COLUMN member_invitations.assigned_role_id IS 'Role to be assigned to the user when they accept the invitation';

-- Create index for assigned_role_id lookups
CREATE INDEX IF NOT EXISTS member_invitations_assigned_role_id_idx
ON member_invitations(assigned_role_id)
WHERE assigned_role_id IS NOT NULL;

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: added missing columns to member_invitations';
END $$;
