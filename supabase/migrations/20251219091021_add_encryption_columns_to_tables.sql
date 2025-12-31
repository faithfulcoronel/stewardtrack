-- Migration: Add Encryption Metadata Columns to Tables with PII
-- Description: Adds tracking columns to tables that store encrypted PII data
-- Author: StewardTrack Development Team
-- Date: 2025-12-19

-- ============================================================================
-- ADD ENCRYPTION METADATA COLUMNS TO MEMBERS TABLE
-- ============================================================================

-- Add columns to track which fields are encrypted and with which key version
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS encrypted_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

-- Add index for querying encrypted records
CREATE INDEX IF NOT EXISTS idx_members_encryption_key_version
  ON members(encryption_key_version)
  WHERE encrypted_fields IS NOT NULL AND encrypted_fields != '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN members.encrypted_fields IS 'JSON array of field names that are encrypted (e.g., ["first_name", "email"])';
COMMENT ON COLUMN members.encryption_key_version IS 'Version of encryption key used to encrypt this record''s PII fields';

-- ============================================================================
-- ADD ENCRYPTION METADATA COLUMNS TO MEMBER_HOUSEHOLDS TABLE
-- ============================================================================

ALTER TABLE member_households
  ADD COLUMN IF NOT EXISTS encrypted_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_member_households_encryption_key_version
  ON member_households(encryption_key_version)
  WHERE encrypted_fields IS NOT NULL AND encrypted_fields != '[]'::jsonb;

COMMENT ON COLUMN member_households.encrypted_fields IS 'JSON array of field names that are encrypted';
COMMENT ON COLUMN member_households.encryption_key_version IS 'Version of encryption key used for this record';

-- ============================================================================
-- ADD ENCRYPTION METADATA COLUMNS TO TENANTS TABLE
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS encrypted_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_tenants_encryption_key_version
  ON tenants(encryption_key_version)
  WHERE encrypted_fields IS NOT NULL AND encrypted_fields != '[]'::jsonb;

COMMENT ON COLUMN tenants.encrypted_fields IS 'JSON array of field names that are encrypted';
COMMENT ON COLUMN tenants.encryption_key_version IS 'Version of encryption key used for this record';

-- ============================================================================
-- ADD ENCRYPTION METADATA COLUMNS TO MEMBER_CARE_PLANS TABLE
-- ============================================================================

ALTER TABLE member_care_plans
  ADD COLUMN IF NOT EXISTS encrypted_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_member_care_plans_encryption_key_version
  ON member_care_plans(encryption_key_version)
  WHERE encrypted_fields IS NOT NULL AND encrypted_fields != '[]'::jsonb;

COMMENT ON COLUMN member_care_plans.encrypted_fields IS 'JSON array of field names that are encrypted';
COMMENT ON COLUMN member_care_plans.encryption_key_version IS 'Version of encryption key used for this record';

-- ============================================================================
-- ADD ENCRYPTION METADATA COLUMNS TO MEMBER_GIVING_PROFILES TABLE
-- ============================================================================

ALTER TABLE member_giving_profiles
  ADD COLUMN IF NOT EXISTS encrypted_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_member_giving_profiles_encryption_key_version
  ON member_giving_profiles(encryption_key_version)
  WHERE encrypted_fields IS NOT NULL AND encrypted_fields != '[]'::jsonb;

COMMENT ON COLUMN member_giving_profiles.encrypted_fields IS 'JSON array of field names that are encrypted (financial PII)';
COMMENT ON COLUMN member_giving_profiles.encryption_key_version IS 'Version of encryption key used for this record';

-- ============================================================================
-- HELPER FUNCTION: Check if Record is Encrypted
-- ============================================================================

CREATE OR REPLACE FUNCTION is_record_encrypted(p_encrypted_fields jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_encrypted_fields IS NOT NULL
    AND p_encrypted_fields != '[]'::jsonb
    AND jsonb_array_length(p_encrypted_fields) > 0;
$$;

COMMENT ON FUNCTION is_record_encrypted IS 'Helper function to check if a record has encrypted fields';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_record_encrypted TO authenticated;
GRANT EXECUTE ON FUNCTION is_record_encrypted TO service_role;

-- ============================================================================
-- HELPER FUNCTION: Get Encrypted Records Count
-- For monitoring and migration progress tracking
-- ============================================================================

CREATE OR REPLACE FUNCTION get_encrypted_records_count(p_table_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE is_record_encrypted(encrypted_fields)',
    p_table_name
  ) INTO v_count;

  RETURN v_count;
EXCEPTION
  WHEN undefined_table THEN
    RETURN 0;
  WHEN undefined_column THEN
    RETURN 0;
END;
$$;

COMMENT ON FUNCTION get_encrypted_records_count IS 'Returns count of records with encrypted fields in specified table';

GRANT EXECUTE ON FUNCTION get_encrypted_records_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_encrypted_records_count TO service_role;

-- ============================================================================
-- HELPER VIEW: Encryption Status Summary
-- Provides overview of encryption status across all tables
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
FROM member_giving_profiles;

COMMENT ON VIEW encryption_status_summary IS 'Overview of encryption status across all tables with PII';

-- Grant access to view
GRANT SELECT ON encryption_status_summary TO authenticated;
GRANT SELECT ON encryption_status_summary TO service_role;
