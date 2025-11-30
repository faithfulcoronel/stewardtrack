import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { MemberAdapter } from '@/adapters/member.adapter';
import { TYPES } from '@/lib/types';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type { Member } from '@/models/member.model';
import type { QueryOptions } from '@/lib/repository/query';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';

/**
 * Encrypted Member Adapter
 *
 * Extends MemberAdapter to automatically encrypt/decrypt PII fields.
 * Uses the Decorator Pattern to add encryption capabilities transparently.
 *
 * Encrypted Fields (14 total):
 * - first_name, last_name, middle_name
 * - email, contact_number, address
 * - birthday, anniversary
 * - emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * - physician_name, pastoral_notes
 * - prayer_requests (array)
 */
@injectable()
export class EncryptedMemberAdapter extends MemberAdapter {
  constructor(
    @inject(TYPES.EncryptionService)
    private encryptionService: EncryptionService,
    @inject(TYPES.AuditService)
    auditService: any // Pass through to parent
  ) {
    super(auditService);
  }

  /**
   * Get PII field configuration for members table
   */
  private getPIIFields() {
    return getFieldEncryptionConfig('members');
  }

  /**
   * Encrypt PII fields before creating a new member record
   */
  protected override async onBeforeCreate(data: Partial<Member>): Promise<Partial<Member>> {
    // Call parent's preprocessing first (validation, household handling, etc.)
    const preprocessed = await super.onBeforeCreate(data);

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('[EncryptedMemberAdapter] Tenant context required for encryption');
    }

    try {
      // Encrypt PII fields
      const encrypted = await this.encryptionService.encryptFields(
        preprocessed,
        tenantId,
        this.getPIIFields()
      );

      // Track which fields are encrypted
      encrypted.encrypted_fields = this.getPIIFields().map(f => f.fieldName);
      encrypted.encryption_key_version = 1; // Will be updated by key manager

      console.log(
        `[EncryptedMemberAdapter] Encrypted ${encrypted.encrypted_fields.length} PII fields for new member`
      );

      return encrypted;
    } catch (error) {
      console.error('[EncryptedMemberAdapter] Encryption failed during create:', error);
      throw new Error(
        `Failed to encrypt member data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Encrypt PII fields before updating a member record
   */
  protected override async onBeforeUpdate(
    id: string,
    data: Partial<Member>
  ): Promise<Partial<Member>> {
    // Call parent's preprocessing first
    const preprocessed = await super.onBeforeUpdate(id, data);

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('[EncryptedMemberAdapter] Tenant context required for encryption');
    }

    try {
      // Only encrypt fields that are actually being updated
      const fieldsToEncrypt = this.getPIIFields().filter(
        field => preprocessed[field.fieldName as keyof Member] !== undefined
      );

      if (fieldsToEncrypt.length === 0) {
        // No PII fields being updated
        return preprocessed;
      }

      // Encrypt the PII fields
      const encrypted = await this.encryptionService.encryptFields(
        preprocessed,
        tenantId,
        fieldsToEncrypt
      );

      console.log(
        `[EncryptedMemberAdapter] Encrypted ${fieldsToEncrypt.length} PII fields for member ${id}`
      );

      return encrypted;
    } catch (error) {
      console.error('[EncryptedMemberAdapter] Encryption failed during update:', error);
      throw new Error(
        `Failed to encrypt member data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt PII fields after fetching members
   */
  public override async fetch(
    options: QueryOptions = {}
  ): Promise<{ data: Member[]; count: number | null }> {
    // Fetch encrypted records from parent
    const result = await super.fetch(options);

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId || !result.data.length) {
      return result;
    }

    try {
      // Decrypt all records in parallel
      const decrypted = await Promise.all(
        result.data.map(async (record) => {
          // Check if record has encrypted fields
          if (!record.encrypted_fields || (record.encrypted_fields as any[]).length === 0) {
            // Legacy plaintext record or no PII fields
            return record;
          }

          return await this.encryptionService.decryptFields(
            record,
            tenantId,
            this.getPIIFields()
          );
        })
      );

      console.log(
        `[EncryptedMemberAdapter] Decrypted ${decrypted.length} member records`
      );

      return { data: decrypted, count: result.count };
    } catch (error) {
      console.error('[EncryptedMemberAdapter] Decryption failed during fetch:', error);
      // Return encrypted data rather than failing completely
      // UI can show masked values
      return result;
    }
  }

  /**
   * Decrypt PII fields after fetching single member
   */
  public override async fetchById(
    id: string,
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<Member | null> {
    // Fetch encrypted record from parent
    const record = await super.fetchById(id, options);

    if (!record) {
      return null;
    }

    // Get tenant context
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      return record;
    }

    try {
      // Check if record has encrypted fields
      if (!record.encrypted_fields || (record.encrypted_fields as any[]).length === 0) {
        // Legacy plaintext record or no PII fields
        return record;
      }

      const decrypted = await this.encryptionService.decryptFields(
        record,
        tenantId,
        this.getPIIFields()
      );

      console.log(
        `[EncryptedMemberAdapter] Decrypted member ${id}`
      );

      return decrypted;
    } catch (error) {
      console.error(`[EncryptedMemberAdapter] Decryption failed for member ${id}:`, error);
      // Return encrypted data rather than failing
      return record;
    }
  }

  /**
   * Fetch all members (decrypted)
   */
  public override async fetchAll(
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<{ data: Member[]; count: number | null }> {
    return this.fetch(options);
  }
}
