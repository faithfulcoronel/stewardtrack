import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IRelationshipTypeRepository } from '@/repositories/relationshipType.repository';
import type { RelationshipType } from '@/models/relationshipType.model';
import type { QueryOptions } from '@/adapters/base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import type { CrudService } from '@/services/CrudService';

@injectable()
export class RelationshipTypeService
  implements CrudService<RelationshipType> {
  constructor(
    @inject(TYPES.IRelationshipTypeRepository)
    private repo: IRelationshipTypeRepository,
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
    data: Partial<RelationshipType>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<RelationshipType>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async getActive(): Promise<RelationshipType[]> {
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
