import 'server-only';
import crypto from 'crypto';
import type { FieldEncryptionConfig } from '@/types/encryption';

/**
 * Utility functions for encryption operations
 */

/**
 * Generate a new encryption master key
 * Use this for generating the ENCRYPTION_MASTER_KEY environment variable
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Validate encrypted value format
 * Format: {keyVersion}.{iv}.{authTag}.{ciphertext}
 */
export function validateEncryptedFormat(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const parts = value.split('.');
  if (parts.length !== 4) {
    return false;
  }

  const [keyVersionStr, iv, authTag, ciphertext] = parts;

  // Validate key version is a number
  const keyVersion = parseInt(keyVersionStr, 10);
  if (isNaN(keyVersion) || keyVersion < 1) {
    return false;
  }

  // Validate all parts are non-empty
  if (!iv || !authTag || !ciphertext) {
    return false;
  }

  // Validate base64 format (basic check)
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(iv) || !base64Regex.test(authTag) || !base64Regex.test(ciphertext)) {
    return false;
  }

  return true;
}

/**
 * Mask a PII value for display in lists/tables
 * Shows first and last characters with asterisks in between
 */
export function maskPIIValue(value: string | null | undefined, visibleChars: number = 2): string {
  if (!value || typeof value !== 'string') {
    return '***';
  }

  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length);
  }

  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  const maskedLength = value.length - (visibleChars * 2);

  return `${start}${'*'.repeat(Math.min(maskedLength, 8))}${end}`;
}

/**
 * Mask email address for display
 * Example: john.doe@example.com → j***e@e*****e.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '***@***.***';
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return maskPIIValue(email);
  }

  const maskedLocal = localPart.length > 2
    ? `${localPart[0]}***${localPart[localPart.length - 1]}`
    : '***';

  const domainParts = domain.split('.');
  const maskedDomain = domainParts.map(part =>
    part.length > 2 ? `${part[0]}***${part[part.length - 1]}` : part
  ).join('.');

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask phone number for display
 * Example: +1-234-567-8900 → +1-***-***-8900
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') {
    return '***-***-****';
  }

  // Remove all non-digit characters for processing
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 4) {
    return '***-***-****';
  }

  // Show last 4 digits
  const last4 = digits.slice(-4);
  const masked = digits.length > 10
    ? `+${digits[0]}-***-***-${last4}`
    : `***-***-${last4}`;

  return masked;
}

/**
 * Get PII field configuration for a specific table
 * Centralized registry of which fields should be encrypted
 */
export function getFieldEncryptionConfig(tableName: string): FieldEncryptionConfig[] {
  const configs: Record<string, FieldEncryptionConfig[]> = {
    members: [
      { fieldName: 'first_name', required: true },
      { fieldName: 'last_name', required: true },
      { fieldName: 'middle_name', required: false },
      { fieldName: 'email', required: false },
      { fieldName: 'contact_number', required: true },
      { fieldName: 'address', required: true },
      { fieldName: 'birthday', required: false },
      { fieldName: 'anniversary', required: false },
      { fieldName: 'emergency_contact_name', required: false },
      { fieldName: 'emergency_contact_phone', required: false },
      { fieldName: 'emergency_contact_relationship', required: false },
      { fieldName: 'physician_name', required: false },
      { fieldName: 'pastoral_notes', required: false },
      { fieldName: 'prayer_requests', required: false, isArray: true }
    ],
    member_households: [
      { fieldName: 'name', required: false },
      { fieldName: 'address_street', required: false },
      { fieldName: 'address_city', required: false },
      { fieldName: 'address_state', required: false },
      { fieldName: 'address_postal_code', required: false },
      { fieldName: 'member_names', required: false, isArray: true }
    ],
    tenants: [
      { fieldName: 'address', required: false },
      { fieldName: 'contact_number', required: false },
      { fieldName: 'email', required: false }
    ],
    member_care_plans: [
      { fieldName: 'details', required: false }
    ],
    member_giving_profiles: [
      // Future: All financial PII fields
    ],
    accounts: [
      { fieldName: 'email', required: false },
      { fieldName: 'phone', required: false },
      { fieldName: 'address', required: false },
      { fieldName: 'tax_id', required: false }, // SSN/EIN - HIGHLY SENSITIVE!
      { fieldName: 'notes', required: false }
    ]
  };

  return configs[tableName] || [];
}

/**
 * Check if a field should be encrypted based on configuration
 */
export function shouldEncryptField(tableName: string, fieldName: string): boolean {
  const config = getFieldEncryptionConfig(tableName);
  return config.some(field => field.fieldName === fieldName);
}

/**
 * Get list of all encrypted field names for a table
 */
export function getEncryptedFieldNames(tableName: string): string[] {
  return getFieldEncryptionConfig(tableName).map(field => field.fieldName);
}

/**
 * Extract key version from encrypted value
 */
export function extractKeyVersion(encryptedValue: string): number | null {
  if (!validateEncryptedFormat(encryptedValue)) {
    return null;
  }

  const [keyVersionStr] = encryptedValue.split('.');
  return parseInt(keyVersionStr, 10);
}

/**
 * Check if a value is encrypted (vs plaintext)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return validateEncryptedFormat(value);
}

/**
 * Sanitize encryption error messages for logging
 * Removes potentially sensitive information from error messages
 */
export function sanitizeEncryptionError(error: Error): string {
  const message = error.message;

  // Remove any potential key material or plaintext from error messages
  const sanitized = message
    .replace(/key[:\s]+[A-Za-z0-9+/=]+/gi, 'key: [REDACTED]')
    .replace(/plaintext[:\s]+.+/gi, 'plaintext: [REDACTED]')
    .replace(/ciphertext[:\s]+.+/gi, 'ciphertext: [REDACTED]');

  return sanitized;
}

/**
 * Create a display-safe version of a record with masked PII
 * Useful for audit logs and list views
 */
export function maskRecordPII<T extends Record<string, any>>(
  record: T,
  tableName: string
): T {
  const config = getFieldEncryptionConfig(tableName);
  const masked = { ...record } as Record<string, any>;

  for (const field of config) {
    const value = record[field.fieldName];

    if (value !== undefined && value !== null) {
      if (field.isArray && Array.isArray(value)) {
        masked[field.fieldName] = value.map(() => '***');
      } else if (field.fieldName.includes('email')) {
        masked[field.fieldName] = maskEmail(value);
      } else if (field.fieldName.includes('phone') || field.fieldName.includes('contact_number')) {
        masked[field.fieldName] = maskPhoneNumber(value);
      } else {
        masked[field.fieldName] = maskPIIValue(value);
      }
    }
  }

  return masked as T;
}
