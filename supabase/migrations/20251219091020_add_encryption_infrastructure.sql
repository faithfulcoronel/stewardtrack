-- Migration: Add PII Encryption Infrastructure
-- Description: Creates tables and functions to support field-level encryption of PII data
-- Author: StewardTrack Development Team
-- Date: 2025-12-19

-- ============================================================================
-- ENCRYPTION KEYS TABLE
-- Stores tenant-specific encryption master keys (encrypted with system key)
-- ============================================================================

CREATE TABLE IF NOT EXISTS encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_version integer NOT NULL DEFAULT 1,
  encrypted_master_key text NOT NULL,
  key_derivation_salt bytea NOT NULL,
  algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),

  -- Ensure unique key versions per tenant
  CONSTRAINT unique_tenant_key_version UNIQUE (tenant_id, key_version),

  -- Validate key version is positive
  CONSTRAINT positive_key_version CHECK (key_version > 0),

  -- Validate algorithm is supported
  CONSTRAINT valid_algorithm CHECK (
    algorithm IN ('AES-256-GCM', 'ChaCha20-Poly1305')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant_id
  ON encryption_keys(tenant_id);

-- Partial unique index to ensure only one active key per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_encryption_keys_unique_active_per_tenant
  ON encryption_keys(tenant_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant_active
  ON encryption_keys(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant_version
  ON encryption_keys(tenant_id, key_version);

-- Enable RLS
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for encryption_keys
-- Only allow access within same tenant context
CREATE POLICY "Users can view their tenant's encryption keys"
  ON encryption_keys
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Only service role can insert/update/delete encryption keys
CREATE POLICY "Service role can manage encryption keys"
  ON encryption_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FIELD ENCRYPTION METADATA TABLE
-- Tracks which fields are encrypted and with which algorithm
-- ============================================================================

CREATE TABLE IF NOT EXISTS field_encryption_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  field_name text NOT NULL,
  encryption_algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  key_version integer NOT NULL DEFAULT 1,
  is_encrypted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint per table-field combination
  CONSTRAINT unique_table_field UNIQUE (table_name, field_name),

  -- Validate algorithm
  CONSTRAINT valid_encryption_algorithm CHECK (
    encryption_algorithm IN ('AES-256-GCM', 'ChaCha20-Poly1305')
  )
);

-- Index for lookups
CREATE INDEX idx_field_encryption_metadata_table
  ON field_encryption_metadata(table_name);

CREATE INDEX idx_field_encryption_metadata_encrypted
  ON field_encryption_metadata(is_encrypted)
  WHERE is_encrypted = true;

-- Enable RLS (allow all authenticated users to read metadata)
ALTER TABLE field_encryption_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view field encryption metadata"
  ON field_encryption_metadata
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify metadata
CREATE POLICY "Service role can manage field encryption metadata"
  ON field_encryption_metadata
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ENCRYPTION AUDIT LOG TABLE
-- Tracks all encryption/decryption operations for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS encryption_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  operation text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  field_names text[] NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,

  -- Validate operation type
  CONSTRAINT valid_operation CHECK (
    operation IN ('encrypt', 'decrypt', 'key_rotation', 'key_access')
  )
);

-- Indexes for audit queries
CREATE INDEX idx_encryption_audit_tenant_date
  ON encryption_audit_log(tenant_id, performed_at DESC);

CREATE INDEX idx_encryption_audit_operation
  ON encryption_audit_log(operation, performed_at DESC);

CREATE INDEX idx_encryption_audit_performed_by
  ON encryption_audit_log(performed_by, performed_at DESC);

CREATE INDEX idx_encryption_audit_record
  ON encryption_audit_log(table_name, record_id);

-- Enable RLS
ALTER TABLE encryption_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
CREATE POLICY "Users can view their tenant's encryption audit logs"
  ON encryption_audit_log
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Only service role can insert audit logs
CREATE POLICY "Service role can insert encryption audit logs"
  ON encryption_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- UPDATED_AT TRIGGER FOR FIELD_ENCRYPTION_METADATA
-- ============================================================================

CREATE TRIGGER update_field_encryption_metadata_updated_at
  BEFORE UPDATE ON field_encryption_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Get Active Encryption Key for Tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_encryption_key(p_tenant_id uuid)
RETURNS TABLE (
  key_id uuid,
  key_version integer,
  algorithm text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ek.id,
    ek.key_version,
    ek.algorithm
  FROM encryption_keys ek
  WHERE ek.tenant_id = p_tenant_id
    AND ek.is_active = true
  LIMIT 1;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Log Encryption Operation
-- ============================================================================

CREATE OR REPLACE FUNCTION log_encryption_operation(
  p_tenant_id uuid,
  p_operation text,
  p_table_name text,
  p_record_id uuid,
  p_field_names text[],
  p_performed_by uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO encryption_audit_log (
    tenant_id,
    operation,
    table_name,
    record_id,
    field_names,
    performed_by,
    performed_at,
    ip_address,
    user_agent
  ) VALUES (
    p_tenant_id,
    p_operation,
    p_table_name,
    p_record_id,
    p_field_names,
    COALESCE(p_performed_by, auth.uid()),
    now(),
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- SEED DEFAULT FIELD ENCRYPTION METADATA
-- Document which fields should be encrypted
-- ============================================================================

INSERT INTO field_encryption_metadata (table_name, field_name, encryption_algorithm, is_encrypted)
VALUES
  -- Members table PII fields
  ('members', 'first_name', 'AES-256-GCM', true),
  ('members', 'last_name', 'AES-256-GCM', true),
  ('members', 'middle_name', 'AES-256-GCM', true),
  ('members', 'email', 'AES-256-GCM', true),
  ('members', 'contact_number', 'AES-256-GCM', true),
  ('members', 'address', 'AES-256-GCM', true),
  ('members', 'birthday', 'AES-256-GCM', true),
  ('members', 'anniversary', 'AES-256-GCM', true),
  ('members', 'emergency_contact_name', 'AES-256-GCM', true),
  ('members', 'emergency_contact_phone', 'AES-256-GCM', true),
  ('members', 'emergency_contact_relationship', 'AES-256-GCM', true),
  ('members', 'physician_name', 'AES-256-GCM', true),
  ('members', 'pastoral_notes', 'AES-256-GCM', true),
  ('members', 'prayer_requests', 'AES-256-GCM', true),

  -- Member households table PII fields
  ('member_households', 'name', 'AES-256-GCM', true),
  ('member_households', 'address_street', 'AES-256-GCM', true),
  ('member_households', 'address_city', 'AES-256-GCM', true),
  ('member_households', 'address_state', 'AES-256-GCM', true),
  ('member_households', 'address_postal_code', 'AES-256-GCM', true),
  ('member_households', 'member_names', 'AES-256-GCM', true),

  -- Tenants table PII fields
  ('tenants', 'address', 'AES-256-GCM', true),
  ('tenants', 'contact_number', 'AES-256-GCM', true),
  ('tenants', 'email', 'AES-256-GCM', true),

  -- Member care plans table
  ('member_care_plans', 'details', 'AES-256-GCM', true)
ON CONFLICT (table_name, field_name) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE encryption_keys IS 'Stores tenant-specific encryption master keys (encrypted with system master key). Each tenant has unique keys for zero-knowledge encryption.';
COMMENT ON COLUMN encryption_keys.encrypted_master_key IS 'Tenant master key encrypted with system master key (stored in env var). Never stored in plaintext.';
COMMENT ON COLUMN encryption_keys.key_version IS 'Version number for key rotation. Increments on each rotation.';
COMMENT ON COLUMN encryption_keys.is_active IS 'Only one active key per tenant. Old keys retained for decrypting legacy data.';

COMMENT ON TABLE field_encryption_metadata IS 'Registry of which database fields contain encrypted PII data.';
COMMENT ON COLUMN field_encryption_metadata.is_encrypted IS 'Flag indicating if field is currently encrypted (allows gradual migration).';

COMMENT ON TABLE encryption_audit_log IS 'Comprehensive audit trail of all encryption operations for compliance (GDPR, HIPAA, SOC 2).';
COMMENT ON COLUMN encryption_audit_log.operation IS 'Type of operation: encrypt, decrypt, key_rotation, key_access';

COMMENT ON FUNCTION get_active_encryption_key IS 'Retrieves the active encryption key metadata for a tenant (does not expose actual key material).';
COMMENT ON FUNCTION log_encryption_operation IS 'Helper function to log encryption operations to audit trail.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Service role needs full access for encryption operations
GRANT ALL ON encryption_keys TO service_role;
GRANT ALL ON field_encryption_metadata TO service_role;
GRANT ALL ON encryption_audit_log TO service_role;

-- Authenticated users need read access to metadata (not keys)
GRANT SELECT ON field_encryption_metadata TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION get_active_encryption_key TO service_role;
GRANT EXECUTE ON FUNCTION log_encryption_operation TO service_role;
