import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { ICategoryRepository } from '../repositories/category.repository';
import type { Category, CategoryType } from '../models/category.model';
import type { QueryOptions } from '../adapters/base.adapter';
import { tenantUtils } from '../utils/tenantUtils';
import type { CrudService } from './CrudService';
import { CategoryValidator } from '../validators/category.validator';
import { validateOrThrow } from '../utils/validation';

@injectable()
export class IncomeCategoryService implements CrudService<Category> {
  constructor(
    @inject(TYPES.ICategoryRepository)
    private repo: ICategoryRepository,
  ) {}

  private addTypeFilter(
    options: QueryOptions,
    type: CategoryType,
  ): QueryOptions {
    return {
      ...options,
      filters: {
        ...(options.filters || {}),
        type: { operator: 'eq', value: type },
      },
    };
  }

  find(
    options: QueryOptions = {},
    type: CategoryType = 'income_transaction',
  ) {
    return this.repo.find(this.addTypeFilter(options, type));
  }

  findAll(
    options: Omit<QueryOptions, 'pagination'> = {},
    type: CategoryType = 'income_transaction',
  ) {
    return this.repo.findAll(this.addTypeFilter(options, type));
  }

  findById(
    id: string,
    options: Omit<QueryOptions, 'pagination'> = {},
    type: CategoryType = 'income_transaction',
  ) {
    return this.repo.findById(id, this.addTypeFilter(options, type));
  }

  create(
    data: Partial<Category>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
    type: CategoryType = 'income_transaction',
  ) {
    validateOrThrow(CategoryValidator, data);
    return this.repo.create(
      { ...data, type },
      relations,
      fieldsToRemove,
    );
  }

  update(
    id: string,
    data: Partial<Category>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
    type: CategoryType = 'income_transaction',
  ) {
    validateOrThrow(CategoryValidator, data);
    return this.repo.update(
      id,
      { ...data, type },
      relations,
      fieldsToRemove,
    );
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async getActive(
    type: CategoryType = 'income_transaction',
  ): Promise<Category[]> {
    const tenantId = await tenantUtils.getTenantId();

    const options: Omit<QueryOptions, 'pagination'> = {
      select: 'id,name',
      filters: {
        is_active: { operator: 'eq', value: true },
        type: { operator: 'eq', value: type },
      },
      order: { column: 'sort_order', ascending: true },
    };

    if (!tenantId) return [];

    options.filters!.tenant_id = { operator: 'eq', value: tenantId };
    const { data } = await this.repo.findAll(options);
    return data;
  }
}
