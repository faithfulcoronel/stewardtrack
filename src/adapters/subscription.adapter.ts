import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { SupabaseClient } from '@supabase/supabase-js';
import { TYPES } from '../lib/types';

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
  @inject(TYPES.SupabaseClient)
  private supabase!: SupabaseClient;
  async getCurrentUsage(): Promise<SubscriptionUsage> {
    const { data: tenantData, error: tenantError } = await this.supabase.rpc('get_current_tenant');
    if (tenantError) throw tenantError;
    const tenant = tenantData?.[0];
    if (!tenant) throw new Error('No tenant found');

    const { count: memberCount } = await this.supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .is('deleted_at', null);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: transactionCount } = await this.supabase
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
