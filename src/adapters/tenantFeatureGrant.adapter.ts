import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { TenantFeatureGrant } from '@/models/rbac.model';

export interface ITenantFeatureGrantAdapter extends IBaseAdapter<TenantFeatureGrant> {
  getTenantFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]>;
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

  async getTenantFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]> {
    const supabase = await this.getSupabaseClient();
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
}
