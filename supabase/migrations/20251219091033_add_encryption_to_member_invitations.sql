-- Add encryption support to member_invitations table
-- This migration adds the encrypted_fields and encryption_key_version columns
-- needed for field-level encryption of PII data (email, notes)

ALTER TABLE member_invitations
ADD COLUMN IF NOT EXISTS encrypted_fields text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

-- Create index for encrypted_fields queries
CREATE INDEX IF NOT EXISTS member_invitations_encrypted_fields_idx ON member_invitations USING GIN (encrypted_fields);

COMMENT ON COLUMN member_invitations.encrypted_fields IS 'Array of field names that are encrypted (email, notes)';
COMMENT ON COLUMN member_invitations.encryption_key_version IS 'Version of encryption key used for this record';
