import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { ITenantFeatureGrantAdapter } from '@/adapters/tenantFeatureGrant.adapter';
import type { TenantFeatureGrant } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface ITenantFeatureGrantRepository extends BaseRepository<TenantFeatureGrant> {
  getTenantFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]>;
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
}
