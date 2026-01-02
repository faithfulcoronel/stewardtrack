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

export interface SubscriptionUpdateParams {
  subscription_status?: 'active' | 'inactive' | 'suspended' | 'cancelled' | 'trialing';
  subscription_tier?: string;
  billing_cycle?: 'monthly' | 'annual';
  subscription_offering_id?: string;
  subscription_end_date?: string | null;
  payment_status?: string;
  last_payment_date?: string | null;
  next_billing_date?: string | null;
  xendit_customer_id?: string;
  xendit_subscription_id?: string;
  payment_failed_count?: number;
  payment_failure_reason?: string;
}

export interface TenantAdminInfo {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
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

  // Subscription management methods
  updateSubscriptionFields(tenantId: string, updates: SubscriptionUpdateParams): Promise<void>;
  getTenantAdmin(tenantId: string): Promise<TenantAdminInfo | null>;
  revokeAllFeatureGrants(tenantId: string): Promise<void>;
  getPaymentFailedCount(tenantId: string): Promise<number>;
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

  // ==================== SUBSCRIPTION MANAGEMENT METHODS ====================

  /**
   * Update subscription-related fields for a tenant
   */
  async updateSubscriptionFields(tenantId: string, updates: SubscriptionUpdateParams): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('tenants')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Get the admin user for a tenant (first tenant_user with user info)
   */
  async getTenantAdmin(tenantId: string): Promise<TenantAdminInfo | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('tenant_users')
      .select(`
        user_id,
        user:users (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to fetch tenant admin: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Handle case where user might be an array (type-safe)
    const user = Array.isArray((data as any).user) ? (data as any).user[0] : (data as any).user;

    if (!user) {
      return null;
    }

    return {
      user_id: data.user_id,
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
    };
  }

  /**
   * Revoke all feature grants for a tenant (used when canceling subscription)
   */
  async revokeAllFeatureGrants(tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('tenant_feature_grants')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to revoke feature grants: ${error.message}`);
    }
  }

  /**
   * Get the current payment failed count for a tenant
   */
  async getPaymentFailedCount(tenantId: string): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('payment_failed_count')
      .eq('id', tenantId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch payment failed count: ${error.message}`);
    }

    return data?.payment_failed_count || 0;
  }
}
