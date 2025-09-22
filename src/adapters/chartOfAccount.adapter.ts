import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { ChartOfAccount } from '@/models/chartOfAccount.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IChartOfAccountAdapter extends IBaseAdapter<ChartOfAccount> {
  getHierarchy(): Promise<ChartOfAccount[]>;
}

@injectable()
export class ChartOfAccountAdapter
  extends BaseAdapter<ChartOfAccount>
  implements IChartOfAccountAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }
  protected tableName = 'chart_of_accounts';
  
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

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'chart_of_accounts',
      foreignKey: 'parent_id',
      select: ['id', 'code', 'name', 'account_type']
    }
  ];

  protected override async onBeforeCreate(data: Partial<ChartOfAccount>): Promise<Partial<ChartOfAccount>> {
    // Set default values
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    
    return data;
  }

  protected override async onAfterCreate(data: ChartOfAccount): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('create', 'chart_of_account', data.id, data);
  }

  protected override async onBeforeUpdate(id: string, data: Partial<ChartOfAccount>): Promise<Partial<ChartOfAccount>> {
    // Repositories handle validation
    return data;
  }

  protected override async onAfterUpdate(data: ChartOfAccount): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('update', 'chart_of_account', data.id, data);
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

    // Check for child accounts
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

  protected override async onAfterDelete(id: string): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('delete', 'chart_of_account', id, { id });
  }


  public async getHierarchy(): Promise<ChartOfAccount[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_chart_of_accounts_hierarchy');

    if (error) throw error;
    return data || [];
  }
}