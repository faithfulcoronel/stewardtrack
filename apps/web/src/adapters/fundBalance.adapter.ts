import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { tenantUtils } from '@/utils/tenantUtils';
import type { RequestContext } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface IFundBalanceAdapter {
  fetchBalance(fundId: string): Promise<{ balance: number } | null>;
}

@injectable()
export class FundBalanceAdapter implements IFundBalanceAdapter {
  private supabase: SupabaseClient | null = null;
  private context: RequestContext = {} as RequestContext;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }
  async fetchBalance(
    fundId: string,
  ): Promise<{ balance: number } | null> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('fund_balances_view')
      .select('balance')
      .eq('tenant_id', tenantId)
      .eq('id', fundId)
      .maybeSingle();

    if (error) throw error;
    return (data as { balance: number } | null);
  }
}
