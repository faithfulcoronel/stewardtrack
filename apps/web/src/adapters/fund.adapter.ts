/**
 * Fund Adapter
 *
 * Handles database operations for accounting funds.
 * Funds are used to track restricted and unrestricted money for fund accounting.
 *
 * @module adapters/fund
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Fund } from '@/models/fund.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for fund database operations.
 * Extends IBaseAdapter with standard CRUD operations for funds.
 */
export type IFundAdapter = IBaseAdapter<Fund>;

/**
 * Fund adapter implementation.
 *
 * Provides database operations for managing accounting funds including:
 * - Creating funds for restricted/unrestricted money tracking
 * - Linking funds to chart of accounts for GL integration
 * - Managing fund balances across fiscal periods
 *
 * Funds can be linked to chart of accounts entries for automated GL posting.
 *
 * @extends BaseAdapter<Fund>
 * @implements IFundAdapter
 */
@injectable()
export class FundAdapter
  extends BaseAdapter<Fund>
  implements IFundAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for funds */
  protected tableName = 'funds';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    code,
    name,
    description,
    type,
    coa_id,
    tenant_id,
    created_by,
    updated_by,
    created_at,
    updated_at
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
   * Post-create hook to log audit event.
   *
   * @param data - Created fund data
   */
  protected override async onAfterCreate(data: Fund): Promise<void> {
    await this.auditService.logAuditEvent('create', 'fund', data.id, data);
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated fund data
   */
  protected override async onAfterUpdate(data: Fund): Promise<void> {
    await this.auditService.logAuditEvent('update', 'fund', data.id, data);
  }

  /**
   * Pre-delete hook to validate fund can be deleted.
   * Prevents deletion of funds with existing financial transactions.
   *
   * @param id - ID of fund being deleted
   * @throws Error if fund has linked financial transactions
   */
  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: tx, error } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('fund_id', id)
      .limit(1);
    if (error) throw error;
    if (tx?.length) {
      throw new Error('Cannot delete fund with existing financial transactions');
    }
  }

  /**
   * Post-delete hook to cascade delete linked chart of accounts entry.
   * Also logs audit event for the deletion.
   *
   * @param id - ID of deleted fund
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('funds')
      .select('coa_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    const coaId = data?.coa_id;
    if (coaId) {
      const { error: delErr } = await supabase
        .from('chart_of_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', coaId);
      if (delErr) throw delErr;
    }
    await this.auditService.logAuditEvent('delete', 'fund', id, { id });
  }
}
