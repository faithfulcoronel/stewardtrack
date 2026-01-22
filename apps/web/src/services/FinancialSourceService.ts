import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFinancialSourceRepository } from '@/repositories/financialSource.repository';
import type { FinancialSource, UpdatePayoutConfigDto } from '@/models/financialSource.model';
import type { DisbursementSchedule } from '@/models/disbursement.model';
import type { ChartOfAccount } from '@/models/chartOfAccount.model';
import type { QueryOptions } from '@/adapters/base.adapter';
import { ChartOfAccountService } from '@/services/ChartOfAccountService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type { CrudService } from '@/services/CrudService';
import { FinancialSourceValidator } from '@/validators/financialSource.validator';
import { validateOrThrow } from '@/utils/validation';

@injectable()
export class FinancialSourceService
  implements CrudService<FinancialSource> {
  constructor(
    @inject(TYPES.IFinancialSourceRepository)
    private repo: IFinancialSourceRepository,
    @inject(TYPES.ChartOfAccountService)
    private coaService: ChartOfAccountService,
    @inject(TYPES.EncryptionService)
    private encryptionService: EncryptionService,
  ) {}

  find(options: QueryOptions = {}) {
    return this.repo.find(options);
  }

  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll(options);
  }

  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  create(
    data: Partial<FinancialSource>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(FinancialSourceValidator, data);
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<FinancialSource>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(FinancialSourceValidator, data);
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async createAssetAccount(name: string): Promise<ChartOfAccount> {
    const assetRoot = await this.coaService.findByCode('1000');

    const assetRootId = assetRoot?.id ?? null;

    // Find all asset codes (starting with '1') to determine the next sequential code
    // We fetch more rows to filter out any legacy long codes (from uniqueID())
    const { data: assetCodeRows } = await this.coaService.find({
      select: 'code',
      filters: { code: { operator: 'startsWith', value: '1' } },
      order: { column: 'code', ascending: false },
      pagination: { page: 1, pageSize: 100 },
    });

    // Filter to only 4-digit codes (proper COA format) and find the max
    const validCodes = (assetCodeRows || [])
      .map((row) => row.code)
      .filter((code) => /^1\d{3}$/.test(code))
      .map((code) => Number(code));

    const maxCode = validCodes.length > 0 ? Math.max(...validCodes) : 1099;
    const nextCode = String(maxCode + 1);

    return this.coaService.create(
      {
        code: nextCode,
        name,
        account_type: 'asset',
        parent_id: assetRootId,
        is_active: true,
      },
      undefined,
      ['chart_of_accounts'],
    );
  }

  async createWithAccount(
    data: Partial<FinancialSource> & { auto_create?: boolean },
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ): Promise<FinancialSource> {
    const { auto_create, ...rest } = data as any;
    const payload = { ...rest } as Partial<FinancialSource>;
    if (auto_create && !payload.coa_id && payload.name) {
      const account = await this.createAssetAccount(payload.name);
      payload.coa_id = account.id;
    }
    return this.create(payload, relations, fieldsToRemove);
  }

  async updateWithAccountCheck(
    id: string,
    data: Partial<FinancialSource> & { auto_create?: boolean },
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ): Promise<FinancialSource> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Financial source not found');
    const existingSource = (existing as any as FinancialSource) ?? existing;

    const { auto_create, ...rest } = data as any;

    if (existingSource.coa_id && rest.coa_id && rest.coa_id !== existingSource.coa_id) {
      throw new Error('Chart of account cannot be changed');
    }

    if (!existingSource.coa_id && auto_create && !rest.coa_id && rest.name) {
      const account = await this.createAssetAccount(rest.name);
      rest.coa_id = account.id;
    }

    if (rest.coa_id === undefined) {
      const { coa_id: _coaId, ...remaining } = rest as any;
      return this.update(id, remaining, relations, fieldsToRemove);
    }

    return this.update(id, rest, relations, fieldsToRemove);
  }

  // ============================================================================
  // PAYOUT CONFIGURATION METHODS (XenPlatform Integration)
  // ============================================================================

  /**
   * Update payout configuration for a financial source.
   * This includes bank account details for Xendit payouts.
   *
   * @param sourceId Financial source ID
   * @param tenantId Tenant ID (for encryption key)
   * @param config Payout configuration
   * @returns Updated financial source
   */
  async updatePayoutConfiguration(
    sourceId: string,
    tenantId: string,
    config: UpdatePayoutConfigDto
  ): Promise<FinancialSource> {
    // Validate the source exists
    const existing = await this.findById(sourceId);
    if (!existing) {
      throw new Error('Financial source not found');
    }

    // If setting as donation destination, clear flag from other sources
    if (config.is_donation_destination) {
      await this.clearDonationDestination(tenantId, sourceId);
    }

    // Encrypt the bank account number
    const encryptedAccountNumber = await this.encryptionService.encrypt(
      config.bank_account_number,
      tenantId,
      'bank_account_number'
    );

    // Update the financial source
    return this.update(sourceId, {
      xendit_channel_code: config.xendit_channel_code,
      bank_account_holder_name: config.bank_account_holder_name,
      bank_account_number_encrypted: encryptedAccountNumber,
      disbursement_schedule: config.disbursement_schedule,
      disbursement_minimum_amount: config.disbursement_minimum_amount,
      is_donation_destination: config.is_donation_destination,
    });
  }

  /**
   * Clear the donation destination flag from all sources except the specified one.
   * This ensures only one source is marked as the donation destination.
   *
   * @param tenantId Tenant ID
   * @param excludeSourceId Source ID to exclude from clearing
   */
  private async clearDonationDestination(
    tenantId: string,
    excludeSourceId: string
  ): Promise<void> {
    // Find all sources marked as donation destination
    const sources = await this.repo.findAll({
      filters: {
        is_donation_destination: { operator: 'equals', value: true },
      },
    });

    // Clear flag from all except the excluded source
    for (const source of sources) {
      if (source.id !== excludeSourceId) {
        await this.update(source.id, {
          is_donation_destination: false,
        });
      }
    }
  }

  /**
   * Get the financial source marked as the donation destination for a tenant.
   * This is where disbursements are sent.
   *
   * @param tenantId Tenant ID
   * @returns Financial source or null if not configured
   */
  async getDonationDestination(tenantId: string): Promise<FinancialSource | null> {
    const sources = await this.repo.findAll({
      filters: {
        is_donation_destination: { operator: 'equals', value: true },
      },
    });

    return sources.length > 0 ? sources[0] : null;
  }

  /**
   * Get payout configuration for a financial source.
   * Returns masked bank account number for security.
   *
   * @param sourceId Financial source ID
   * @param tenantId Tenant ID (for decryption)
   * @returns Payout configuration with masked account number
   */
  async getPayoutConfiguration(
    sourceId: string,
    tenantId: string
  ): Promise<PayoutConfigResponse | null> {
    const source = await this.findById(sourceId);
    if (!source) {
      return null;
    }

    // Mask the account number if configured
    let maskedAccountNumber: string | null = null;
    if (source.bank_account_number_encrypted) {
      try {
        const decrypted = await this.encryptionService.decrypt(
          source.bank_account_number_encrypted,
          tenantId,
          'bank_account_number'
        );
        if (decrypted) {
          // Mask all but last 4 digits
          maskedAccountNumber = decrypted.slice(-4).padStart(decrypted.length, '*');
        }
      } catch (error) {
        console.error('[FinancialSourceService] Failed to decrypt account number:', error);
      }
    }

    return {
      sourceId: source.id,
      sourceName: source.name,
      xendit_channel_code: source.xendit_channel_code,
      bank_account_holder_name: source.bank_account_holder_name,
      bank_account_number_masked: maskedAccountNumber,
      disbursement_schedule: source.disbursement_schedule,
      disbursement_minimum_amount: source.disbursement_minimum_amount,
      is_donation_destination: source.is_donation_destination,
      last_disbursement_at: source.last_disbursement_at,
    };
  }

  /**
   * Clear payout configuration from a financial source.
   *
   * @param sourceId Financial source ID
   * @returns Updated financial source
   */
  async clearPayoutConfiguration(sourceId: string): Promise<FinancialSource> {
    return this.update(sourceId, {
      xendit_channel_code: null,
      bank_account_holder_name: null,
      bank_account_number_encrypted: null,
      disbursement_schedule: null,
      disbursement_minimum_amount: null,
      is_donation_destination: false,
    });
  }

  /**
   * Get decrypted bank account number for payout processing.
   * Only use this during actual disbursement processing!
   *
   * @param sourceId Financial source ID
   * @param tenantId Tenant ID (for decryption)
   * @returns Decrypted bank account number or null
   */
  async getDecryptedBankAccountNumber(
    sourceId: string,
    tenantId: string
  ): Promise<string | null> {
    const source = await this.findById(sourceId);
    if (!source?.bank_account_number_encrypted) {
      return null;
    }

    return this.encryptionService.decrypt(
      source.bank_account_number_encrypted,
      tenantId,
      'bank_account_number'
    );
  }
}

/**
 * Payout configuration response with masked account number
 */
export interface PayoutConfigResponse {
  sourceId: string;
  sourceName: string;
  xendit_channel_code: string | null;
  bank_account_holder_name: string | null;
  bank_account_number_masked: string | null;
  disbursement_schedule: DisbursementSchedule | null;
  disbursement_minimum_amount: number | null;
  is_donation_destination: boolean;
  last_disbursement_at: string | null;
}
