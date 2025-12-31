/**
 * Type definitions for the encryption system
 */

/**
 * Encrypted data structure returned by encryption strategies
 */
export interface EncryptedData {
  /** Base64-encoded initialization vector (96 bits for GCM) */
  iv: string;
  /** Base64-encoded authentication tag (128 bits for GCM) */
  authTag: string;
  /** Base64-encoded encrypted data */
  ciphertext: string;
}

/**
 * Configuration for field-level encryption
 */
export interface FieldEncryptionConfig {
  /** Name of the field to encrypt */
  fieldName: string;
  /** Whether the field is required (affects validation) */
  required: boolean;
  /** Whether the field is an array (requires special handling) */
  isArray?: boolean;
  /** Whether to use deterministic encryption (for searchable fields) */
  deterministic?: boolean;
}

/**
 * Tenant encryption key metadata
 */
export interface TenantEncryptionKey {
  id: string;
  tenant_id: string;
  key_version: number;
  encrypted_master_key: string;
  key_derivation_salt: Buffer;
  algorithm: string;
  is_active: boolean;
  created_at: string;
  rotated_at?: string | null;
}

/**
 * Encryption audit log entry
 */
export interface EncryptionAuditLog {
  id: string;
  tenant_id: string;
  operation: 'encrypt' | 'decrypt' | 'key_rotation' | 'key_access';
  table_name: string;
  record_id: string;
  field_names: string[];
  performed_by: string | null;
  performed_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Field encryption metadata
 */
export interface FieldEncryptionMetadata {
  id: string;
  table_name: string;
  field_name: string;
  encryption_algorithm: string;
  key_version: number;
  is_encrypted: boolean;
  created_at: string;
}

/**
 * Encryption configuration options
 */
export interface EncryptionOptions {
  /** Enable audit logging for encryption operations */
  enableAuditLog?: boolean;
  /** Cache derived keys for performance */
  enableKeyCache?: boolean;
  /** Encryption algorithm to use */
  algorithm?: 'AES-256-GCM' | 'ChaCha20-Poly1305';
}

/**
 * Result of encryption operation
 */
export interface EncryptionResult {
  /** Whether encryption was successful */
  success: boolean;
  /** Error message if encryption failed */
  error?: string;
  /** Number of fields encrypted */
  fieldsEncrypted?: number;
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  /** Whether rotation was successful */
  success: boolean;
  /** Old key version */
  oldVersion: number;
  /** New key version */
  newVersion: number;
  /** Number of records re-encrypted */
  recordsReEncrypted?: number;
  /** Error message if rotation failed */
  error?: string;
}
