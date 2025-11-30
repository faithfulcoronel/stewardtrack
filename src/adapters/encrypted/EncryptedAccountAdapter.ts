import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { AccountAdapter } from '@/adapters/account.adapter';
import { Account } from '@/models/account.model';
import type { AuditService } from '@/services/AuditService';
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';
import { TYPES } from '@/lib/types';
import type { QueryOptions } from '@/adapters/base.adapter';

/**
 * Encrypted Account Adapter
 *
 * Decorates AccountAdapter with automatic PII encryption/decryption.
 *
 * Encrypted Fields:
 * - email (contact email for account)
 * - phone (contact phone number)
 * - address (physical address)
 * - tax_id (SSN/EIN - HIGHLY SENSITIVE!)
 * - notes (free-form notes that may contain PII)
 *
 * Security Features:
 * - Transparent encryption/decryption in adapter layer
 * - Per-tenant encryption keys
 * - Field-level encryption with AES-256-GCM
 * - Audit logging of encryption operations
 * - No business logic changes required
 *
 * Usage:
 * This adapter is a drop-in replacement for AccountAdapter.
 * Update DI container bindings to use this adapter instead.
 */
@injectable()
export class EncryptedAccountAdapter extends AccountAdapter {
  constructor(
    @inject(TYPES.AuditService) auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super(auditService);
  }

  /**
   * Get PII field configuration for accounts table
   */
  private getPIIFields() {
    return getFieldEncryptionConfig('accounts');
  }

  /**
   * Encrypt PII fields before creating account record
   */
  protected override async onBeforeCreate(data: Partial<Account>): Promise<Partial<Account>> {
    // Call parent lifecycle hook first
    const preprocessed = await super.onBeforeCreate(data);

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context required for encryption');
    }

    // Encrypt PII fields
    const encrypted = await this.encryptionService.encryptFields(
      preprocessed,
      tenantId,
      this.getPIIFields()
    );

    // Track which fields were encrypted
    encrypted.encrypted_fields = this.getPIIFields()
      .map(field => field.fieldName)
      .filter(fieldName => preprocessed[fieldName as keyof Account] !== undefined);

    // Record current encryption key version
    encrypted.encryption_key_version = 1; // TODO: Get from EncryptionKeyManager

    return encrypted;
  }

  /**
   * Encrypt PII fields before updating account record
   */
  protected override async onBeforeUpdate(id: string, data: Partial<Account>): Promise<Partial<Account>> {
    // Call parent lifecycle hook first
    const preprocessed = await super.onBeforeUpdate(id, data);

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context required for encryption');
    }

    // Only encrypt fields that are being updated
    const fieldsToEncrypt = this.getPIIFields().filter(
      field => preprocessed[field.fieldName as keyof Account] !== undefined
    );

    if (fieldsToEncrypt.length === 0) {
      return preprocessed; // No PII fields being updated
    }

    // Encrypt PII fields
    const encrypted = await this.encryptionService.encryptFields(
      preprocessed,
      tenantId,
      fieldsToEncrypt
    );

    // Update encrypted_fields array (merge with existing)
    const existingRecord = await this.fetchById(id);
    if (!existingRecord) {
      throw new Error(`Account with ID ${id} not found`);
    }

    const existingEncryptedFields = existingRecord.encrypted_fields || [];
    const newEncryptedFields = fieldsToEncrypt.map(f => f.fieldName);
    encrypted.encrypted_fields = [
      ...new Set([...existingEncryptedFields, ...newEncryptedFields])
    ];

    // Update encryption key version if encrypting new fields
    if (newEncryptedFields.length > 0) {
      encrypted.encryption_key_version = 1; // TODO: Get from EncryptionKeyManager
    }

    return encrypted;
  }

  /**
   * Decrypt PII fields after fetching account records
   */
  public override async fetch(options: QueryOptions = {}): Promise<{ data: Account[]; count: number | null }> {
    // Fetch encrypted records
    const result = await super.fetch(options);

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context required for decryption');
    }

    // Decrypt PII fields for each record
    const decryptedData = await Promise.all(
      result.data.map(async (record) => {
        // Only decrypt if record has encrypted fields
        if (!record.encrypted_fields || record.encrypted_fields.length === 0) {
          return record;
        }

        // Determine which fields need decryption
        const fieldsToDecrypt = this.getPIIFields().filter(
          field => record.encrypted_fields?.includes(field.fieldName)
        );

        if (fieldsToDecrypt.length === 0) {
          return record;
        }

        // Decrypt fields
        return await this.encryptionService.decryptFields(
          record,
          tenantId,
          fieldsToDecrypt
        );
      })
    );

    return {
      data: decryptedData,
      count: result.count
    };
  }

  /**
   * Decrypt PII fields after fetching single account record
   */
  public override async fetchById(id: string, options: QueryOptions = {}): Promise<Account | null> {
    // Fetch encrypted record
    const record = await super.fetchById(id, options);

    // Handle null case
    if (!record) {
      return null;
    }

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context required for decryption');
    }

    // Only decrypt if record has encrypted fields
    if (!record.encrypted_fields || record.encrypted_fields.length === 0) {
      return record;
    }

    // Determine which fields need decryption
    const fieldsToDecrypt = this.getPIIFields().filter(
      field => record.encrypted_fields?.includes(field.fieldName)
    );

    if (fieldsToDecrypt.length === 0) {
      return record;
    }

    // Decrypt fields
    return await this.encryptionService.decryptFields(
      record,
      tenantId,
      fieldsToDecrypt
    );
  }
}
