import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { SupabaseClient } from '@supabase/supabase-js';
import { tenantUtils } from '../utils/tenantUtils';
import { format } from 'date-fns';
import { TYPES } from '../lib/types';
import { SourceRecentTransaction } from '../models/sourceRecentTransaction.model';
import type { RequestContext } from '../lib/server/context';

export interface ISourceRecentTransactionAdapter {
  fetchRecent(
    accountId: string,
    limit?: number,
  ): Promise<SourceRecentTransaction[]>;
  fetchRecentByFund(
    fundId: string,
    limit?: number,
  ): Promise<SourceRecentTransaction[]>;
  fetchBalance(accountId: string): Promise<number>;
  fetchBalanceByFund(fundId: string): Promise<number[]>;
}

@injectable()
export class SourceRecentTransactionAdapter
  implements ISourceRecentTransactionAdapter
{
  @inject(TYPES.SupabaseClient)
  private supabase!: SupabaseClient;
  @inject(TYPES.RequestContext)
  private context!: RequestContext;

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }
  async fetchRecent(
    accountId: string,
    limit = 5,
  ): Promise<SourceRecentTransaction[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    const { data, error } = await this.supabase
      .from('source_recent_transactions_view')
      .select(
        `
          header_id,
          source_id,
          account_id,
          fund_id,
          date,
          category,
          description,
          amount
        `
      )
      .eq('account_id', accountId)
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as SourceRecentTransaction[]) || [];
  }

  async fetchRecentByFund(
    fundId: string,
    limit = 5,
  ): Promise<SourceRecentTransaction[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    const { data, error } = await this.supabase
      .from('source_recent_transactions_view')
      .select(
        `
          header_id,
          source_id,
          account_id,
          fund_id,
          date,
          category,
          description,
          amount
        `
      )
      .eq('fund_id', fundId)
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as SourceRecentTransaction[]) || [];
  }

  async fetchBalance(accountId: string): Promise<number> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    const { data, error } = await this.supabase.rpc('report_trial_balance', {
      p_tenant_id: tenantId,
      p_end_date: format(new Date(), 'yyyy-MM-dd'),
    });

    if (error) throw error;
    const row = (data || []).find((r: any) => r.account_id === accountId);
    if (!row) return 0;
    return Number(row.debit_balance) - Number(row.credit_balance);
  }

  async fetchBalanceByFund(fundId: string): Promise<number[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    const { data, error } = await this.supabase
      .from('source_recent_transactions_view')
      .select('amount')
      .eq('fund_id', fundId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return ((data || []).map((r: any) => r.amount) as number[]);
  }
}
