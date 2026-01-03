import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { TenantFeatureGrant } from '@/models/rbac.model';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

export interface ITenantFeatureGrantAdapter extends IBaseAdapter<TenantFeatureGrant> {
  getTenantFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]>;
  deleteByTenantId(tenantId: string): Promise<number>;
}

@injectable()
export class TenantFeatureGrantAdapter extends BaseAdapter<TenantFeatureGrant> implements ITenantFeatureGrantAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'tenant_feature_grants';
  protected defaultSelect = `*`;

  /**
   * Get tenant feature grants using elevated access (service role client).
   * This bypasses RLS to allow super admin operations to query feature grants
   * for any tenant, not just the current user's tenant.
   */
  async getTenantFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]> {
    // Use service role client for elevated access - bypasses RLS
    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        feature:feature_catalog (*)
      `)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to fetch tenant feature grants: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Override delete to use elevated access for super admin operations.
   * Uses hard delete since tenant_feature_grants doesn't have soft delete columns.
   */
  override async delete(id: string): Promise<void> {
    // Use service role client for elevated access
    const supabase = await getSupabaseServiceClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete tenant feature grant: ${error.message}`);
    }
  }

  /**
   * Delete all feature grants for a specific tenant using elevated access.
   * This is more efficient than deleting one by one.
   */
  async deleteByTenantId(tenantId: string): Promise<number> {
    // Use service role client for elevated access
    const supabase = await getSupabaseServiceClient();

    // First count existing grants
    const { data: existing } = await supabase
      .from(this.tableName)
      .select('id')
      .eq('tenant_id', tenantId);

    const count = existing?.length || 0;

    if (count === 0) {
      return 0;
    }

    // Delete all grants for this tenant
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete tenant feature grants: ${error.message}`);
    }

    return count;
  }
}
