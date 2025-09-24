import 'server-only';
import { injectable, inject } from 'inversify';

import { TYPES } from '@/lib/types';
import type { QueryOptions } from '@/adapters/base.adapter';
import type { CrudService } from '@/services/CrudService';
import type { IMembershipCenterRepository } from '@/repositories/membershipCenter.repository';
import type { MembershipCenter } from '@/models/membershipCenter.model';
import { tenantUtils } from '@/utils/tenantUtils';

@injectable()
export class MembershipCenterService
  implements CrudService<MembershipCenter>
{
  constructor(
    @inject(TYPES.IMembershipCenterRepository)
    private readonly repo: IMembershipCenterRepository,
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
    data: Partial<MembershipCenter>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<MembershipCenter>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async getActive(): Promise<MembershipCenter[]> {
    const tenantId = await tenantUtils.getTenantId();

    const options: Omit<QueryOptions, 'pagination'> = {
      select: 'id,code,name,is_primary,sort_order',
      filters: {
        is_active: { operator: 'eq', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    };

    if (!tenantId) {
      return [];
    }

    options.filters!.tenant_id = { operator: 'eq', value: tenantId };

    const { data } = await this.repo.findAll(options);
    return data ?? [];
  }
}
