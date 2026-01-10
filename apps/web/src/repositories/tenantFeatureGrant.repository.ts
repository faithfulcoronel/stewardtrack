import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { ITenantFeatureGrantAdapter, FeatureSyncResult } from '@/adapters/tenantFeatureGrant.adapter';
import type { TenantFeatureGrant } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface ITenantFeatureGrantRepository extends BaseRepository<TenantFeatureGrant> {
  getTenantFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]>;
  getByTenantId(tenantId: string): Promise<TenantFeatureGrant[]>;
  deleteByTenantId(tenantId: string): Promise<number>;
  syncTenantSubscriptionFeatures(tenantId: string): Promise<FeatureSyncResult>;
}

@injectable()
export class TenantFeatureGrantRepository extends BaseRepository<TenantFeatureGrant> implements ITenantFeatureGrantRepository {
  constructor(
    @inject(TYPES.ITenantFeatureGrantAdapter) private readonly tenantFeatureGrantAdapter: ITenantFeatureGrantAdapter
  ) {
    super(tenantFeatureGrantAdapter);
  }

  async getTenantFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]> {
    return await this.tenantFeatureGrantAdapter.getTenantFeatureGrants(tenantId);
  }

  async getByTenantId(tenantId: string): Promise<TenantFeatureGrant[]> {
    return await this.tenantFeatureGrantAdapter.getTenantFeatureGrants(tenantId);
  }

  async deleteByTenantId(tenantId: string): Promise<number> {
    return await this.tenantFeatureGrantAdapter.deleteByTenantId(tenantId);
  }

  async syncTenantSubscriptionFeatures(tenantId: string): Promise<FeatureSyncResult> {
    return await this.tenantFeatureGrantAdapter.syncTenantSubscriptionFeatures(tenantId);
  }
}
