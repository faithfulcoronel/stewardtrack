import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Account } from '@/models/account.model';
import type { AuditService } from '@/services/AuditService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { TYPES } from '@/lib/types';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';

export type IAccountAdapter = IBaseAdapter<Account>;

/**
 * Account Adapter with built-in encryption for PII fields
 *
 * Encrypted Fields (5 total):
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
 * - Audit logging of operations
 */
@injectable()
export class AccountAdapter
  extends BaseAdapter<Account>
  implements IAccountAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super();
  }

  protected tableName = 'accounts';

  protected defaultSelect = `
    id,
    name,
    account_type,
    account_number,
    description,
    email,
    phone,
    address,
    website,
    tax_id,
    is_active,
    notes,
    member_id,
    encrypted_fields,
    encryption_key_version,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'members',
      foreignKey: 'member_id',
      select: ['id', 'first_name', 'last_name', 'email', 'contact_number']
    }
  ];

  /**
   * Get PII field configuration for accounts table
   */
  private getPIIFields() {
    return getFieldEncryptionConfig('accounts');
  }

  protected override async onBeforeCreate(data: Partial<Account>): Promise<Partial<Account>> {
    // Set default values
    if (data.is_active === undefined) {
      data.is_active = true;
    }

    // Encrypt PII fields before creating record
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('[AccountAdapter] Tenant context required for encryption');
    }

    try {
      const encrypted = await this.encryptionService.encryptFields(
        data,
        tenantId,
        this.getPIIFields()
      );

      // Track which fields are encrypted
      encrypted.encrypted_fields = this.getPIIFields().map(f => f.fieldName);
      encrypted.encryption_key_version = 1; // Will be updated by key manager

      console.log(
        `[AccountAdapter] Encrypted ${encrypted.encrypted_fields.length} PII fields for new account`
      );

      return encrypted;
    } catch (error) {
      console.error('[AccountAdapter] Encryption failed during create:', error);
      throw new Error(
        `Failed to encrypt account data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  protected override async onAfterCreate(data: Account): Promise<void> {
    // Decrypt account data before logging to audit (so audit logs show readable values)
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      // If no tenant context, log encrypted data as fallback
      await this.auditService.logAuditEvent('create', 'account', data.id, data);
      return;
    }

    try {
      // Check if data has encrypted fields
      if (!data.encrypted_fields || (data.encrypted_fields as any[]).length === 0) {
        // No encryption, log as-is
        await this.auditService.logAuditEvent('create', 'account', data.id, data);
        return;
      }

      // Decrypt for audit logging
      const decrypted = await this.encryptionService.decryptFields(
        data,
        tenantId,
        this.getPIIFields()
      );

      // Log audit event with decrypted data
      await this.auditService.logAuditEvent('create', 'account', data.id, decrypted);
    } catch (error) {
      console.error('[AccountAdapter] Failed to decrypt for audit logging:', error);
      // Log encrypted data as fallback
      await this.auditService.logAuditEvent('create', 'account', data.id, data);
    }
  }

  protected override async onBeforeUpdate(id: string, data: Partial<Account>): Promise<Partial<Account>> {
    // Encrypt PII fields before updating record
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      throw new Error('[AccountAdapter] Tenant context required for encryption');
    }

    try {
      // Only encrypt fields that are actually being updated
      const fieldsToEncrypt = this.getPIIFields().filter(
        field => data[field.fieldName as keyof Account] !== undefined
      );

      if (fieldsToEncrypt.length === 0) {
        // No PII fields being updated
        return data;
      }

      // Encrypt the PII fields
      const encrypted = await this.encryptionService.encryptFields(
        data,
        tenantId,
        fieldsToEncrypt
      );

      // Update encrypted_fields marker to include ALL encrypted field names
      const allPIIFieldNames = this.getPIIFields().map(f => f.fieldName);
      encrypted.encrypted_fields = allPIIFieldNames;
      encrypted.encryption_key_version = 1; // Will be updated by key manager

      console.log(
        `[AccountAdapter] Encrypted ${fieldsToEncrypt.length} PII fields for account ${id}`
      );

      return encrypted;
    } catch (error) {
      console.error('[AccountAdapter] Encryption failed during update:', error);
      throw new Error(
        `Failed to encrypt account data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  protected override async onAfterUpdate(data: Account): Promise<void> {
    // Decrypt account data before logging to audit (so audit logs show readable values)
    const tenantId = this.context?.tenantId;
    if (!tenantId) {
      // If no tenant context, log encrypted data as fallback
      await this.auditService.logAuditEvent('update', 'account', data.id, data);
      return;
    }

    try {
      // Check if data has encrypted fields
      if (!data.encrypted_fields || (data.encrypted_fields as any[]).length === 0) {
        // No encryption, log as-is
        await this.auditService.logAuditEvent('update', 'account', data.id, data);
        return;
      }

      // Decrypt for audit logging
      const decrypted = await this.encryptionService.decryptFields(
        data,
        tenantId,
        this.getPIIFields()
      );

      // Log audit event with decrypted data
      await this.auditService.logAuditEvent('update', 'account', data.id, decrypted);
    } catch (error) {
      console.error('[AccountAdapter] Failed to decrypt for audit logging:', error);
      // Log encrypted data as fallback
      await this.auditService.logAuditEvent('update', 'account', data.id, data);
    }
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    // Check for financial transactions
    const supabase = await this.getSupabaseClient();
    const { data: transactions, error: transactionsError } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('account_id', id)
      .limit(1);

    if (transactionsError) throw transactionsError;
    if (transactions?.length) {
      throw new Error('Cannot delete account with existing financial transactions');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('delete', 'account', id, { id });
  }

  /**
   * Decrypt PII fields after fetching accounts
   */
  public override async fetch(
    options: QueryOptions = {}
  ): Promise<{ data: Account[]; count: number | null }> {
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
        `[AccountAdapter] Decrypted ${decrypted.length} account records`
      );

      return { data: decrypted, count: result.count };
    } catch (error) {
      console.error('[AccountAdapter] Decryption failed during fetch:', error);
      // Return encrypted data rather than failing completely
      return result;
    }
  }

  /**
   * Decrypt PII fields after fetching single account
   */
  public override async fetchById(
    id: string,
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<Account | null> {
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
        `[AccountAdapter] Decrypted account ${id}`
      );

      return decrypted;
    } catch (error) {
      console.error(`[AccountAdapter] Decryption failed for account ${id}:`, error);
      // Return encrypted data rather than failing
      return record;
    }
  }

  /**
   * Fetch all accounts (decrypted)
   */
  public override async fetchAll(
    options: Omit<QueryOptions, 'pagination'> = {}
  ): Promise<{ data: Account[]; count: number | null }> {
    return this.fetch(options);
  }
}
