/**
 * Financial Source Adapter
 *
 * Handles database operations for financial sources (bank accounts, wallets, cash funds).
 * Financial sources track where money is held and support online payment integrations.
 *
 * @module adapters/financialSource
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { FinancialSource } from '@/models/financialSource.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for financial source database operations.
 * Extends IBaseAdapter with standard CRUD operations for sources.
 */
export type IFinancialSourceAdapter = IBaseAdapter<FinancialSource>;

/**
 * Financial Source adapter implementation.
 *
 * Provides database operations for managing financial sources including:
 * - Bank accounts
 * - Digital wallets (GCash, Maya, etc.)
 * - Cash funds
 * - Online payment processors (Xendit integration)
 *
 * Supports online giving by tracking payment processor configuration
 * and disbursement settings.
 *
 * @extends BaseAdapter<FinancialSource>
 * @implements IFinancialSourceAdapter
 */
@injectable()
export class FinancialSourceAdapter
  extends BaseAdapter<FinancialSource>
  implements IFinancialSourceAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for financial sources */
  protected tableName = 'financial_sources';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    name,
    description,
    source_type,
    account_number,
    coa_id,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at,
    xendit_payout_channel_id,
    xendit_payout_channel_type,
    disbursement_schedule,
    disbursement_minimum_amount,
    last_disbursement_at,
    is_donation_destination,
    bank_account_holder_name,
    bank_account_number_encrypted,
    xendit_channel_code
  `;

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'chart_of_accounts',
      foreignKey: 'coa_id',
      select: ['id', 'code', 'name']
    }
  ];

  /**
   * Pre-create hook to set default values.
   * Sets is_active to true if not provided.
   *
   * @param data - Partial source data being created
   * @returns Modified source data with defaults applied
   */
  protected override async onBeforeCreate(data: Partial<FinancialSource>): Promise<Partial<FinancialSource>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }

    return data;
  }

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created source data
   */
  protected override async onAfterCreate(data: FinancialSource): Promise<void> {
    await this.auditService.logAuditEvent('create', 'financial_source', data.id, data);
  }

  /**
   * Pre-update hook. Validation is handled by repositories.
   *
   * @param id - ID of source being updated
   * @param data - Partial source data to update
   * @returns Modified source data
   */
  protected override async onBeforeUpdate(id: string, data: Partial<FinancialSource>): Promise<Partial<FinancialSource>> {
    return data;
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated source data
   */
  protected override async onAfterUpdate(data: FinancialSource): Promise<void> {
    await this.auditService.logAuditEvent('update', 'financial_source', data.id, data);
  }

  /**
   * Pre-delete hook to validate source can be deleted.
   * Prevents deletion of sources with existing financial transactions.
   *
   * @param id - ID of source being deleted
   * @throws Error if source has linked financial transactions
   */
  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: transactions, error: transactionsError } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('source_id', id)
      .limit(1);

    if (transactionsError) throw transactionsError;
    if (transactions?.length) {
      throw new Error('Cannot delete source with existing financial transactions');
    }
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted source
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'financial_source', id, { id });
  }
}