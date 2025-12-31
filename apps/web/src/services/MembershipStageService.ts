import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMembershipStageRepository } from '@/repositories/membershipStage.repository';
import type { MembershipStage } from '@/models/membershipStage.model';
import type { QueryOptions } from '@/adapters/base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import type { CrudService } from '@/services/CrudService';

@injectable()
export class MembershipStageService
  implements CrudService<MembershipStage> {
  constructor(
    @inject(TYPES.IMembershipStageRepository)
    private repo: IMembershipStageRepository,
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
    data: Partial<MembershipStage>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<MembershipStage>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async getActive(): Promise<MembershipStage[]> {
    const tenantId = await tenantUtils.getTenantId();

    const options: Omit<QueryOptions, 'pagination'> = {
      select: 'id,code,name,sort_order',
      filters: {
        is_active: { operator: 'eq', value: true },
      },
      order: { column: 'sort_order', ascending: true },
    };

    if (!tenantId) return [];

    options.filters!.tenant_id = { operator: 'eq', value: tenantId };
    const { data } = await this.repo.findAll(options);
    return (data ?? []).slice().sort((a, b) => {
      const orderA = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const nameA = (a.name ?? '').toLocaleLowerCase();
      const nameB = (b.name ?? '').toLocaleLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
}
