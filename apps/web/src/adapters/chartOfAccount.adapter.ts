/**
 * Chart of Accounts Adapter
 *
 * Handles database operations for general ledger accounts.
 * Chart of accounts provides the account structure for double-entry bookkeeping.
 *
 * @module adapters/chartOfAccount
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { ChartOfAccount } from '@/models/chartOfAccount.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for chart of accounts database operations.
 * Extends IBaseAdapter with additional hierarchy queries.
 */
export interface IChartOfAccountAdapter extends IBaseAdapter<ChartOfAccount> {
  /**
   * Get the full chart of accounts hierarchy.
   *
   * @returns Promise resolving to array of accounts with parent-child relationships
   */
  getHierarchy(): Promise<ChartOfAccount[]>;
}

/**
 * Chart of Accounts adapter implementation.
 *
 * Provides database operations for managing the general ledger account structure:
 * - Asset, liability, equity, revenue, and expense accounts
 * - Hierarchical parent-child account relationships
 * - Account type and subtype classification
 *
 * Supports double-entry bookkeeping by providing the account structure
 * for recording debits and credits.
 *
 * @extends BaseAdapter<ChartOfAccount>
 * @implements IChartOfAccountAdapter
 */
@injectable()
export class ChartOfAccountAdapter
  extends BaseAdapter<ChartOfAccount>
  implements IChartOfAccountAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for chart of accounts */
  protected tableName = 'chart_of_accounts';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    code,
    name,
    description,
    account_type,
    account_subtype,
    is_active,
    parent_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'chart_of_accounts',
      foreignKey: 'parent_id',
      select: ['id', 'code', 'name', 'account_type']
    }
  ];

  /**
   * Pre-create hook to set default values.
   * Sets is_active to true if not provided.
   *
   * @param data - Partial account data being created
   * @returns Modified account data with defaults applied
   */
  protected override async onBeforeCreate(data: Partial<ChartOfAccount>): Promise<Partial<ChartOfAccount>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }

    return data;
  }

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created account data
   */
  protected override async onAfterCreate(data: ChartOfAccount): Promise<void> {
    await this.auditService.logAuditEvent('create', 'chart_of_account', data.id, data);
  }

  /**
   * Pre-update hook. Validation is handled by repositories.
   *
   * @param id - ID of account being updated
   * @param data - Partial account data to update
   * @returns Modified account data
   */
  protected override async onBeforeUpdate(id: string, data: Partial<ChartOfAccount>): Promise<Partial<ChartOfAccount>> {
    return data;
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated account data
   */
  protected override async onAfterUpdate(data: ChartOfAccount): Promise<void> {
    await this.auditService.logAuditEvent('update', 'chart_of_account', data.id, data);
  }

  /**
   * Pre-delete hook to validate account can be deleted.
   * Prevents deletion of accounts with:
   * - Existing financial transactions
   * - Child accounts in hierarchy
   *
   * @param id - ID of account being deleted
   * @throws Error if account has transactions or child accounts
   */
  protected override async onBeforeDelete(id: string): Promise<void> {
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

    const { data: children, error: childrenError } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('parent_id', id)
      .limit(1);

    if (childrenError) throw childrenError;
    if (children?.length) {
      throw new Error('Cannot delete account with child accounts');
    }
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted account
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'chart_of_account', id, { id });
  }

  /**
   * Get the full chart of accounts hierarchy.
   * Uses a database function to efficiently retrieve the nested structure.
   *
   * @returns Promise resolving to array of accounts with parent-child relationships
   */
  public async getHierarchy(): Promise<ChartOfAccount[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_chart_of_accounts_hierarchy');

    if (error) throw error;
    return data || [];
  }
}