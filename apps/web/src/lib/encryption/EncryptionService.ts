import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IEncryptionStrategy } from './strategies/IEncryptionStrategy';
import type { EncryptionKeyManager } from './EncryptionKeyManager';
import type { FieldEncryptionConfig, EncryptionOptions } from '@/types/encryption';

/**
 * Main encryption service that coordinates encryption/decryption operations
 *
 * Features:
 * - Field-level encryption/decryption
 * - Automatic key derivation per field
 * - Key versioning support
 * - Batch operations for multiple fields
 * - Null/undefined handling
 * - Array field support
 *
 * Format of encrypted values: {version}.{iv}.{authTag}.{ciphertext}
 * Example: 1.a3f2c4d5e6f7a8b9.1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.8f3a2c1b9e7d6f4a...
 */
@injectable()
export class EncryptionService {
  constructor(
    @inject(TYPES.EncryptionStrategy)
    private strategy: IEncryptionStrategy,

    @inject(TYPES.EncryptionKeyManager)
    private keyManager: EncryptionKeyManager
  ) {}

  /**
   * Encrypt a single field value
   */
  async encrypt(
    plaintext: string | null | undefined,
    tenantId: string,
    fieldName: string
  ): Promise<string | null> {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
      return null;
    }

    try {
      // Get tenant's master key
      const { masterKey, keyVersion } = await this.keyManager.getTenantKey(tenantId);

      // Derive field-specific key
      const fieldKey = this.keyManager.deriveFieldKey(masterKey, fieldName);

      // Encrypt using strategy
      const encrypted = await this.strategy.encrypt(plaintext, fieldKey);

      // Format: {version}.{iv}.{authTag}.{ciphertext}
      return `${keyVersion}.${encrypted.iv}.${encrypted.authTag}.${encrypted.ciphertext}`;
    } catch (error) {
      console.error(
        `[EncryptionService] Encryption failed for field ${fieldName}:`,
        error
      );
      throw new Error(
        `Encryption failed for field ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt a single field value
   */
  async decrypt(
    encryptedValue: string | null | undefined,
    tenantId: string,
    fieldName: string
  ): Promise<string | null> {
    if (
      encryptedValue === null ||
      encryptedValue === undefined ||
      encryptedValue === ''
    ) {
      return null;
    }

    try {
      // Parse encrypted format: {version}.{iv}.{authTag}.{ciphertext}
      const parts = encryptedValue.split('.');

      if (parts.length !== 4) {
        // If not in encrypted format, assume it's legacy plaintext
        // This allows gradual migration
        console.warn(
          `[EncryptionService] Field ${fieldName} is not encrypted, returning as-is`
        );
        return encryptedValue;
      }

      const [keyVersionStr, iv, authTag, ciphertext] = parts;
      const keyVersion = parseInt(keyVersionStr, 10);

      if (isNaN(keyVersion)) {
        console.warn(
          `[EncryptionService] Invalid key version in field ${fieldName}, returning as-is`
        );
        return encryptedValue;
      }

      // Get tenant's master key for specific version
      const { masterKey } = await this.keyManager.getTenantKey(tenantId, keyVersion);

      // Derive field-specific key
      const fieldKey = this.keyManager.deriveFieldKey(masterKey, fieldName);

      // Decrypt using strategy
      const plaintext = await this.strategy.decrypt({ iv, authTag, ciphertext }, fieldKey);

      return plaintext;
    } catch (error) {
      console.error(
        `[EncryptionService] Decryption failed for field ${fieldName}:`,
        error
      );
      throw new Error(
        `Decryption failed for field ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Encrypt an array field (JSON array of strings)
   */
  async encryptArray(
    values: string[] | null | undefined,
    tenantId: string,
    fieldName: string
  ): Promise<string | null> {
    if (!values || values.length === 0) {
      return null;
    }

    // Serialize array to JSON, then encrypt
    const jsonString = JSON.stringify(values);
    return await this.encrypt(jsonString, tenantId, fieldName);
  }

  /**
   * Decrypt an array field (JSON array of strings)
   */
  async decryptArray(
    encryptedValue: string | null | undefined,
    tenantId: string,
    fieldName: string
  ): Promise<string[] | null> {
    const decrypted = await this.decrypt(encryptedValue, tenantId, fieldName);

    if (!decrypted) {
      return null;
    }

    try {
      const parsed = JSON.parse(decrypted);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.error(
        `[EncryptionService] Failed to parse decrypted array for field ${fieldName}:`,
        error
      );
      return null;
    }
  }

  /**
   * Encrypt multiple fields in a record
   */
  async encryptFields<T extends Record<string, any>>(
    data: T,
    tenantId: string,
    fieldConfig: FieldEncryptionConfig[]
  ): Promise<T> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const encrypted = { ...data } as Record<string, any>;

    for (const config of fieldConfig) {
      const value = data[config.fieldName];

      // Skip if field not present in data
      if (value === undefined) {
        continue;
      }

      try {
        if (config.isArray) {
          // Handle array fields
          encrypted[config.fieldName] = await this.encryptArray(
            value,
            tenantId,
            config.fieldName
          );
        } else {
          // Handle string fields
          encrypted[config.fieldName] = await this.encrypt(
            value,
            tenantId,
            config.fieldName
          );
        }
      } catch (error) {
        console.error(
          `[EncryptionService] Failed to encrypt field ${config.fieldName}:`,
          error
        );

        // If encryption fails and field is required, throw error
        if (config.required) {
          throw error;
        }

        // Otherwise, keep original value
        encrypted[config.fieldName] = value;
      }
    }

    return encrypted as T;
  }

  /**
   * Decrypt multiple fields in a record
   */
  async decryptFields<T extends Record<string, any>>(
    data: T,
    tenantId: string,
    fieldConfig: FieldEncryptionConfig[]
  ): Promise<T> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const decrypted = { ...data } as Record<string, any>;

    for (const config of fieldConfig) {
      const value = data[config.fieldName];

      // Skip if field not present in data
      if (value === undefined) {
        continue;
      }

      try {
        if (config.isArray) {
          // Handle array fields
          decrypted[config.fieldName] = await this.decryptArray(
            value,
            tenantId,
            config.fieldName
          );
        } else {
          // Handle string fields
          decrypted[config.fieldName] = await this.decrypt(
            value,
            tenantId,
            config.fieldName
          );
        }
      } catch (error) {
        console.error(
          `[EncryptionService] Failed to decrypt field ${config.fieldName}:`,
          error
        );

        // If decryption fails, return null for safety
        decrypted[config.fieldName] = null;
      }
    }

    return decrypted as T;
  }

  /**
   * Batch encrypt multiple records
   */
  async encryptRecords<T extends Record<string, any>>(
    records: T[],
    tenantId: string,
    fieldConfig: FieldEncryptionConfig[]
  ): Promise<T[]> {
    return await Promise.all(
      records.map(record => this.encryptFields(record, tenantId, fieldConfig))
    );
  }

  /**
   * Batch decrypt multiple records
   */
  async decryptRecords<T extends Record<string, any>>(
    records: T[],
    tenantId: string,
    fieldConfig: FieldEncryptionConfig[]
  ): Promise<T[]> {
    return await Promise.all(
      records.map(record => this.decryptFields(record, tenantId, fieldConfig))
    );
  }

  /**
   * Check if a value is encrypted (has the correct format)
   */
  isEncrypted(value: string | null | undefined): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    // Check format: {version}.{iv}.{authTag}.{ciphertext}
    const parts = value.split('.');
    if (parts.length !== 4) {
      return false;
    }

    const [keyVersionStr] = parts;
    const keyVersion = parseInt(keyVersionStr, 10);

    return !isNaN(keyVersion) && keyVersion > 0;
  }

  /**
   * Get algorithm information
   */
  getAlgorithmInfo(): {
    name: string;
    keySize: number;
    ivSize: number;
  } {
    return {
      name: this.strategy.getAlgorithmName(),
      keySize: this.strategy.getKeySize(),
      ivSize: this.strategy.getIVSize()
    };
  }
}
