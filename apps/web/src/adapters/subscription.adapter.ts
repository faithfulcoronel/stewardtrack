import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SubscriptionUsage {
  tenant: any;
  memberCount: number;
  transactionCount: number;
}

export interface ISubscriptionAdapter {
  getCurrentUsage(): Promise<SubscriptionUsage>;
}

@injectable()
export class SubscriptionAdapter implements ISubscriptionAdapter {
  private supabase: SupabaseClient | null = null;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }
  async getCurrentUsage(): Promise<SubscriptionUsage> {
    const supabase = await this.getSupabaseClient();
    const { data: tenantData, error: tenantError } = await supabase.rpc('get_current_tenant');
    if (tenantError) throw tenantError;
    const tenant = tenantData?.[0];
    if (!tenant) throw new Error('No tenant found');

    const { count: memberCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .is('deleted_at', null);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: transactionCount } = await supabase
      .from('financial_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('date', startOfMonth.toISOString());

    return {
      tenant,
      memberCount: memberCount || 0,
      transactionCount: transactionCount || 0,
    };
  }
}
