import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { FinancialSource } from '@/models/financialSource.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IFinancialSourceAdapter = IBaseAdapter<FinancialSource>;

@injectable()
export class FinancialSourceAdapter
  extends BaseAdapter<FinancialSource>
  implements IFinancialSourceAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }
  protected tableName = 'financial_sources';
  
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

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'chart_of_accounts',
      foreignKey: 'coa_id',
      select: ['id', 'code', 'name']
    }
  ];

  protected override async onBeforeCreate(data: Partial<FinancialSource>): Promise<Partial<FinancialSource>> {
    // Set default values
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    
    return data;
  }

  protected override async onAfterCreate(data: FinancialSource): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('create', 'financial_source', data.id, data);
  }

  protected override async onBeforeUpdate(id: string, data: Partial<FinancialSource>): Promise<Partial<FinancialSource>> {
    // Repositories handle validation
    return data;
  }

  protected override async onAfterUpdate(data: FinancialSource): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('update', 'financial_source', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    // Check for financial transactions
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

  protected override async onAfterDelete(id: string): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('delete', 'financial_source', id, { id });
  }

}