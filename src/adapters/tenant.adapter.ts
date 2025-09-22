import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Tenant } from '@/models/tenant.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface ITenantAdapter extends IBaseAdapter<Tenant> {
  getCurrentTenant(): Promise<Tenant | null>;
  updateSubscription(tier: string, cycle: 'monthly' | 'annual'): Promise<unknown>;
  getTenantDataCounts(tenantId: string): Promise<Record<string, number>>;
  uploadLogo(tenantId: string, file: File): Promise<Tenant>;
  resetTenantData(tenantId: string): Promise<void>;
  /** Preview records that would be removed by a reset */
  previewResetTenantData(tenantId: string): Promise<Record<string, number>>;
}

@injectable()
export class TenantAdapter
  extends BaseAdapter<Tenant>
  implements ITenantAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'tenants';

  protected defaultSelect = `
    id,
    name,
    subdomain,
    address,
    contact_number,
    email,
    website,
    logo_url,
    status,
    subscription_tier,
    subscription_status,
    billing_cycle,
    subscription_end_date,
    created_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onAfterCreate(data: Tenant): Promise<void> {
    await this.auditService.logAuditEvent('create', 'tenant', data.id, data);
  }

  protected override async onAfterUpdate(data: Tenant): Promise<void> {
    await this.auditService.logAuditEvent('update', 'tenant', data.id, data);
  }

  async getCurrentTenant() {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_current_tenant');
    if (error) throw error;
    return (data?.[0] as Tenant) || null;
  }

  async updateSubscription(tier: string, cycle: 'monthly' | 'annual') {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('update_tenant_subscription', {
      p_subscription_tier: tier.toLowerCase(),
      p_billing_cycle: cycle,
    });
    if (error) throw error;
    return data;
  }

  async getTenantDataCounts(tenantId: string) {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_tenant_data_counts', {
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    return data?.[0] as Record<string, number>;
  }

  async uploadLogo(tenantId: string, file: File) {
    const supabase = await this.getSupabaseClient();
    const arrayBuffer = await file.arrayBuffer();
    const fileExt = file.name.split('.').pop();
    const path = `${tenantId}/logo.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('tenant-logos')
      .upload(path, arrayBuffer, { upsert: true });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('tenant-logos').getPublicUrl(path);

    const { data, error } = await supabase
      .from('tenants')
      .update({ profile_picture_url: publicUrl })
      .eq('id', tenantId)
      .select()
      .single();
    if (error) throw error;
    return data as Tenant;
  }

  async resetTenantData(tenantId: string) {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.rpc('reset_tenant_data', {
      p_tenant_id: tenantId,
    });
    if (error) throw error;
  }

  async previewResetTenantData(tenantId: string) {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc(
      'preview_reset_tenant_data',
      { p_tenant_id: tenantId },
    );
    if (error) throw error;
    return (data?.[0] as Record<string, number>) || {};
  }
}
