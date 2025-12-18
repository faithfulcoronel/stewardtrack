import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Tenant } from '@/models/tenant.model';
import type { ITenantAdapter, PublicProductOffering, TenantUserData } from '@/adapters/tenant.adapter';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

// Re-export types for convenience
export type { PublicProductOffering, TenantUserData };

export interface ITenantRepository extends BaseRepository<Tenant> {
  getCurrentTenant(): Promise<Tenant | null>;
  updateSubscription(tier: string, cycle: 'monthly' | 'annual'): Promise<unknown>;
  getTenantDataCounts(tenantId: string): Promise<Record<string, number>>;
  uploadLogo(tenantId: string, file: File): Promise<Tenant>;
  resetTenantData(tenantId: string): Promise<void>;
  previewResetTenantData(tenantId: string): Promise<Record<string, number>>;

  // Registration flow methods
  checkSubdomainExists(subdomain: string): Promise<boolean>;
  createTenantForRegistration(tenantData: Partial<Tenant>): Promise<Tenant>;
  createTenantUserRelationship(tenantUserData: TenantUserData): Promise<void>;
  deleteTenantForCleanup(tenantId: string): Promise<void>;
  getPublicProductOffering(offeringId: string): Promise<PublicProductOffering | null>;
}

@injectable()
export class TenantRepository
  extends BaseRepository<Tenant>
  implements ITenantRepository
{
  constructor(
    @inject(TYPES.ITenantAdapter)
    private readonly tenantAdapter: ITenantAdapter
  ) {
    super(tenantAdapter);
  }

  protected override async afterCreate(data: Tenant): Promise<void> {
    NotificationService.showSuccess(`Tenant "${data.name}" created successfully`);
  }

  protected override async afterUpdate(data: Tenant): Promise<void> {
    NotificationService.showSuccess(`Tenant "${data.name}" updated successfully`);
  }

  async getCurrentTenant(): Promise<Tenant | null> {
    return this.tenantAdapter.getCurrentTenant();
  }

  async updateSubscription(tier: string, cycle: 'monthly' | 'annual'): Promise<unknown> {
    return this.tenantAdapter.updateSubscription(tier, cycle);
  }

  async getTenantDataCounts(tenantId: string): Promise<Record<string, number>> {
    return this.tenantAdapter.getTenantDataCounts(tenantId);
  }

  async uploadLogo(tenantId: string, file: File): Promise<Tenant> {
    return this.tenantAdapter.uploadLogo(tenantId, file);
  }

  async resetTenantData(tenantId: string): Promise<void> {
    return this.tenantAdapter.resetTenantData(tenantId);
  }

  async previewResetTenantData(tenantId: string): Promise<Record<string, number>> {
    return this.tenantAdapter.previewResetTenantData(tenantId);
  }

  // Registration flow methods - delegate to adapter
  async checkSubdomainExists(subdomain: string): Promise<boolean> {
    return this.tenantAdapter.checkSubdomainExists(subdomain);
  }

  async createTenantForRegistration(tenantData: Partial<Tenant>): Promise<Tenant> {
    return this.tenantAdapter.createTenantWithServiceRole(tenantData);
  }

  async createTenantUserRelationship(tenantUserData: TenantUserData): Promise<void> {
    return this.tenantAdapter.createTenantUserRelationship(tenantUserData);
  }

  async deleteTenantForCleanup(tenantId: string): Promise<void> {
    return this.tenantAdapter.deleteTenantWithServiceRole(tenantId);
  }

  async getPublicProductOffering(offeringId: string): Promise<PublicProductOffering | null> {
    return this.tenantAdapter.fetchPublicProductOffering(offeringId);
  }
}