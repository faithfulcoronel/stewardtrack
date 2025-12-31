import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Tenant } from '@/models/tenant.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

export interface PublicProductOffering {
  id: string;
  tier: string;
  offering_type: string;
  code: string;
  name: string;
  description?: string | null;
  base_price?: number | null;
  billing_cycle?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TenantUserData {
  tenant_id: string;
  user_id: string;
  role: string;
  admin_role?: string | null;
  created_by: string;
}

export interface ITenantAdapter extends IBaseAdapter<Tenant> {
  getCurrentTenant(): Promise<Tenant | null>;
  updateSubscription(tier: string, cycle: 'monthly' | 'annual'): Promise<unknown>;
  getTenantDataCounts(tenantId: string): Promise<Record<string, number>>;
  uploadLogo(tenantId: string, file: File): Promise<Tenant>;
  resetTenantData(tenantId: string): Promise<void>;
  /** Preview records that would be removed by a reset */
  previewResetTenantData(tenantId: string): Promise<Record<string, number>>;

  // Registration flow methods
  checkSubdomainExists(subdomain: string): Promise<boolean>;
  createTenantWithServiceRole(tenantData: Partial<Tenant>): Promise<Tenant>;
  createTenantUserRelationship(tenantUserData: TenantUserData): Promise<void>;
  deleteTenantWithServiceRole(tenantId: string): Promise<void>;
  fetchPublicProductOffering(offeringId: string): Promise<PublicProductOffering | null>;
  getTenantStatus(tenantId: string): Promise<any>;
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
    currency,
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

  /**
   * Override update to skip tenant context check
   * The tenants table doesn't have tenant_id - it IS the tenants table
   * During onboarding, users may not have tenant session established yet
   */
  public async update(
    id: string,
    data: Partial<Tenant>,
    relations?: Record<string, string[]>
  ): Promise<Tenant> {
    // Run pre-update hook
    const processedData = await this.onBeforeUpdate(id, data);

    // Update record
    const userId = await this.getUserId();
    const supabase = await this.getSupabaseClient();
    const record: Record<string, unknown> = {
      ...processedData,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from(this.tableName)
      .update(record)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update tenant: ${updateError.message}`);
    }

    // Handle relations if provided
    if (relations) {
      await this.updateRelations(id, relations);
    }

    // Run post-update hook
    await this.onAfterUpdate(updated);

    return updated;
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

  // ==================== REGISTRATION FLOW METHODS ====================

  /**
   * Check if a subdomain already exists
   */
  async checkSubdomainExists(subdomain: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    return !!data;
  }

  /**
   * Create a new tenant using service role (for registration)
   */
  async createTenantWithServiceRole(tenantData: Partial<Tenant>): Promise<Tenant> {
    const serviceSupabase = await getSupabaseServiceClient();

    const { data, error } = await serviceSupabase
      .from('tenants')
      .insert(tenantData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create tenant: ${error.message}`);
    }

    if (!data) {
      throw new Error('Tenant creation failed - no data returned');
    }

    return data as Tenant;
  }

  /**
   * Create a tenant-user relationship using service role (for registration)
   */
  async createTenantUserRelationship(tenantUserData: TenantUserData): Promise<void> {
    const serviceSupabase = await getSupabaseServiceClient();

    const { error } = await serviceSupabase
      .from('tenant_users')
      .insert(tenantUserData);

    if (error) {
      throw new Error(`Failed to create tenant-user relationship: ${error.message}`);
    }
  }

  /**
   * Delete a tenant using service role (for cleanup/rollback)
   */
  async deleteTenantWithServiceRole(tenantId: string): Promise<void> {
    const serviceSupabase = await getSupabaseServiceClient();

    const { error } = await serviceSupabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (error) {
      throw new Error(`Failed to delete tenant: ${error.message}`);
    }
  }

  /**
   * Fetch public product offering details via RPC
   */
  async fetchPublicProductOffering(offeringId: string): Promise<PublicProductOffering | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_public_product_offerings', {
      include_features: false,
      include_bundles: false,
      target_tier: null,
      target_id: offeringId,
    });

    if (error) {
      throw new Error(`Failed to load product offering: ${error.message}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const [offering] = data as PublicProductOffering[];
    return offering ?? null;
  }

  /**
   * Fetch diagnostic tenant status information.
   */
  async getTenantStatus(tenantId: string) {
    const supabase = await this.getSupabaseClient();

    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, code, name, metadata_key, is_system')
      .eq('tenant_id', tenantId);

    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('id, code, name, source, source_reference')
      .eq('tenant_id', tenantId);

    const { data: rolePermissions, error: rpError } = await supabase
      .from('role_permissions')
      .select(`
        id,
        role:roles(code, name),
        permission:permissions(code, name)
      `)
      .in('role_id', (roles || []).map(r => r.id));

    const { data: surfaceBindings, error: sbError } = await supabase
      .from('rbac_surface_bindings')
      .select('id, surface_id, required_feature_code, is_active')
      .eq('tenant_id', tenantId);

    const { data: featureGrants, error: fgError } = await supabase
      .from('tenant_feature_grants')
      .select(`
        id,
        feature:feature_catalog(code, name)
      `)
      .eq('tenant_id', tenantId);

    return {
      roles: {
        count: roles?.length || 0,
        data: roles || [],
        error: rolesError?.message
      },
      permissions: {
        count: permissions?.length || 0,
        data: permissions || [],
        error: permissionsError?.message
      },
      rolePermissions: {
        count: rolePermissions?.length || 0,
        data: rolePermissions || [],
        error: rpError?.message
      },
      surfaceBindings: {
        count: surfaceBindings?.length || 0,
        data: surfaceBindings || [],
        error: sbError?.message
      },
      featureGrants: {
        count: featureGrants?.length || 0,
        data: featureGrants || [],
        error: fgError?.message
      }
    };
  }
}
