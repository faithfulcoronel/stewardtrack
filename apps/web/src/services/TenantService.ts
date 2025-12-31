import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { Tenant } from '@/models/tenant.model';
import { TenantValidator } from '@/validators/tenant.validator';
import { validateOrThrow } from '@/utils/validation';

@injectable()
export class TenantService {
  constructor(
    @inject(TYPES.ITenantRepository)
    private repo: ITenantRepository,
  ) {}

  getCurrentTenant(): Promise<Tenant | null> {
    return this.repo.getCurrentTenant();
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repo.findById(id);
  }

  updateTenant(id: string, data: Partial<Tenant>) {
    validateOrThrow(TenantValidator, data);
    return this.repo.update(id, data);
  }

  uploadLogo(tenantId: string, file: File) {
    return this.repo.uploadLogo(tenantId, file);
  }

  getTenantDataCounts(tenantId: string) {
    return this.repo.getTenantDataCounts(tenantId);
  }

  resetTenantData(tenantId: string) {
    return this.repo.resetTenantData(tenantId);
  }

  previewResetTenantData(tenantId: string) {
    // Use existing counts RPC for preview to improve compatibility
    return this.repo.getTenantDataCounts(tenantId);
  }
}

export type { Tenant };
