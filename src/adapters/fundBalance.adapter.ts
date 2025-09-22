import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { SupabaseClient } from '@supabase/supabase-js';
import { tenantUtils } from '../utils/tenantUtils';
import { TYPES } from '../lib/types';
import type { RequestContext } from '../lib/server/context';

export interface IFundBalanceAdapter {
  fetchBalance(fundId: string): Promise<{ balance: number } | null>;
}

@injectable()
export class FundBalanceAdapter implements IFundBalanceAdapter {
  @inject(TYPES.SupabaseClient)
  private supabase!: SupabaseClient;
  @inject(TYPES.RequestContext)
  private context!: RequestContext;

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }
  async fetchBalance(
    fundId: string,
  ): Promise<{ balance: number } | null> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    const { data, error } = await this.supabase
      .from('fund_balances_view')
      .select('balance')
      .eq('tenant_id', tenantId)
      .eq('id', fundId)
      .maybeSingle();

    if (error) throw error;
    return (data as { balance: number } | null);
  }
}
