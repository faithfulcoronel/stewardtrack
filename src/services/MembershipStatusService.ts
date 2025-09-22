import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMembershipStatusRepository } from '@/repositories/membershipStatus.repository';
import type { MembershipStatus } from '@/models/membershipStatus.model';
import type { QueryOptions } from '@/adapters/base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import type { CrudService } from '@/services/CrudService';

@injectable()
export class MembershipStatusService
  implements CrudService<MembershipStatus> {
  constructor(
    @inject(TYPES.IMembershipStatusRepository)
    private repo: IMembershipStatusRepository,
  ) {}

  find(options: QueryOptions = {}) {
    return this.repo.find(options);
  }

  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll(options);
  }

  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  create(
    data: Partial<MembershipStatus>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<MembershipStatus>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async getActive(): Promise<MembershipStatus[]> {
    const tenantId = await tenantUtils.getTenantId();

    const options: Omit<QueryOptions, 'pagination'> = {
      select: 'id,name',
      filters: {
        is_active: { operator: 'eq', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    };

    if (!tenantId) return [];

    options.filters!.tenant_id = { operator: 'eq', value: tenantId };
    const { data } = await this.repo.findAll(options);
    return data;
  }
}
