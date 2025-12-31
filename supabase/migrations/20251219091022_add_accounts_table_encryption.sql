-- Migration: Add Encryption Support for Accounts Table
-- Description: Adds encryption metadata columns to accounts table and registers PII fields
-- Author: StewardTrack Development Team
-- Date: 2025-12-19

-- ============================================================================
-- ADD ENCRYPTION METADATA COLUMNS TO ACCOUNTS TABLE
-- ============================================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS encrypted_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

-- Add index for querying encrypted records
CREATE INDEX IF NOT EXISTS idx_accounts_encryption_key_version
  ON accounts(encryption_key_version)
  WHERE encrypted_fields IS NOT NULL AND encrypted_fields != '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN accounts.encrypted_fields IS 'JSON array of field names that are encrypted (email, phone, address, tax_id, notes)';
COMMENT ON COLUMN accounts.encryption_key_version IS 'Version of encryption key used for this record';

-- ============================================================================
-- REGISTER ACCOUNTS PII FIELDS IN ENCRYPTION METADATA
-- ============================================================================

INSERT INTO field_encryption_metadata (table_name, field_name, encryption_algorithm, is_encrypted)
VALUES
  ('accounts', 'email', 'AES-256-GCM', true),
  ('accounts', 'phone', 'AES-256-GCM', true),
  ('accounts', 'address', 'AES-256-GCM', true),
  ('accounts', 'tax_id', 'AES-256-GCM', true), -- SSN/EIN - HIGHLY SENSITIVE
  ('accounts', 'notes', 'AES-256-GCM', true)
ON CONFLICT (table_name, field_name) DO NOTHING;

-- ============================================================================
-- UPDATE ENCRYPTION STATUS SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW encryption_status_summary AS
SELECT
  'members' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields)) AS encrypted_records,
  ROUND(
    COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields))::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) AS encryption_percentage
FROM members
UNION ALL
SELECT
  'member_households' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields)) AS encrypted_records,
  ROUND(
    COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields))::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) AS encryption_percentage
FROM member_households
UNION ALL
SELECT
  'tenants' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields)) AS encrypted_records,
  ROUND(
    COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields))::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) AS encryption_percentage
FROM tenants
UNION ALL
SELECT
  'member_care_plans' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields)) AS encrypted_records,
  ROUND(
    COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields))::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) AS encryption_percentage
FROM member_care_plans
UNION ALL
SELECT
  'member_giving_profiles' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields)) AS encrypted_records,
  ROUND(
    COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields))::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) AS encryption_percentage
FROM member_giving_profiles
UNION ALL
SELECT
  'accounts' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields)) AS encrypted_records,
  ROUND(
    COUNT(*) FILTER (WHERE is_record_encrypted(encrypted_fields))::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) AS encryption_percentage
FROM accounts;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE accounts IS 'Financial accounts table - contains highly sensitive PII including tax IDs (SSN/EIN)';
