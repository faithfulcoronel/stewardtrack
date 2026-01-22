-- =============================================================================
-- Migration: Add account name to encryption metadata
-- =============================================================================
-- Description: Register the 'name' field for accounts table as an encrypted field
--              Account names can contain PII (especially for person-type accounts)
-- Date: 2026-01-20
-- =============================================================================

-- Register accounts.name in field_encryption_metadata
INSERT INTO field_encryption_metadata (table_name, field_name, encryption_algorithm, is_encrypted)
VALUES ('accounts', 'name', 'AES-256-GCM', true)
ON CONFLICT (table_name, field_name) DO NOTHING;

-- Update comment on accounts table
COMMENT ON COLUMN accounts.name IS 'Account name - encrypted PII field (especially sensitive for person-type accounts)';

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Added accounts.name to field_encryption_metadata for PII encryption';
END $$;
