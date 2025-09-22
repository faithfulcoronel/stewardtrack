import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { Tenant } from '../models/tenant.model';
import type { ITenantAdapter } from '../adapters/tenant.adapter';
import { NotificationService } from '../services/NotificationService';

export interface ITenantRepository extends BaseRepository<Tenant> {
  getCurrentTenant(): Promise<Tenant | null>;
  updateSubscription(tier: string, cycle: 'monthly' | 'annual'): Promise<unknown>;
  getTenantDataCounts(tenantId: string): Promise<Record<string, number>>;
  uploadLogo(tenantId: string, file: File): Promise<Tenant>;
  resetTenantData(tenantId: string): Promise<void>;
  previewResetTenantData(tenantId: string): Promise<Record<string, number>>;
}

@injectable()
export class TenantRepository
  extends BaseRepository<Tenant>
  implements ITenantRepository
{
  constructor(@inject('ITenantAdapter') adapter: BaseAdapter<Tenant>) {
    super(adapter);
  }

  protected override async afterCreate(data: Tenant): Promise<void> {
    NotificationService.showSuccess(`Tenant "${data.name}" created successfully`);
  }

  protected override async afterUpdate(data: Tenant): Promise<void> {
    NotificationService.showSuccess(`Tenant "${data.name}" updated successfully`);
  }

  async getCurrentTenant(): Promise<Tenant | null> {
    return (this.adapter as unknown as ITenantAdapter).getCurrentTenant();
  }

  async updateSubscription(tier: string, cycle: 'monthly' | 'annual'): Promise<unknown> {
    return (this.adapter as unknown as ITenantAdapter).updateSubscription(tier, cycle);
  }

  async getTenantDataCounts(tenantId: string): Promise<Record<string, number>> {
    return (this.adapter as unknown as ITenantAdapter).getTenantDataCounts(tenantId);
  }

  async uploadLogo(tenantId: string, file: File): Promise<Tenant> {
    return (this.adapter as unknown as ITenantAdapter).uploadLogo(tenantId, file);
  }

  async resetTenantData(tenantId: string): Promise<void> {
    return (this.adapter as unknown as ITenantAdapter).resetTenantData(tenantId);
  }

  async previewResetTenantData(tenantId: string): Promise<Record<string, number>> {
    return (this.adapter as unknown as ITenantAdapter).previewResetTenantData(tenantId);
  }
}