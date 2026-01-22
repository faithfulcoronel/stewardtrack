import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { Category, CategoryType } from '@/models/category.model';
import type { QueryOptions } from '@/adapters/base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import type { CrudService } from '@/services/CrudService';
import { CategoryValidator } from '@/validators/category.validator';
import { validateOrThrow } from '@/utils/validation';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

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
    tenantId?: string,
  ): Promise<Category[]> {
    // Use provided tenantId or fall back to authenticated user's tenant
    const effectiveTenantId = tenantId || (await tenantUtils.getTenantId());

    if (!effectiveTenantId) return [];

    const options: Omit<QueryOptions, 'pagination'> = {
      select: 'id,name,code,description',
      filters: {
        is_active: { operator: 'eq', value: true },
        type: { operator: 'eq', value: type },
        tenant_id: { operator: 'eq', value: effectiveTenantId },
      },
      order: { column: 'sort_order', ascending: true },
    };

    const { data } = await this.repo.findAll(options);
    return data;
  }

  /**
   * Get active categories for public/unauthenticated access.
   * Uses service role client to bypass RLS policies.
   *
   * SECURITY: Only returns non-sensitive category data (id, name, code, description).
   * Tenant ID must be explicitly provided - no session fallback.
   *
   * @param tenantId - Required tenant ID (typically decoded from tenant token)
   * @param type - Category type (default: 'income_transaction' for donations)
   */
  async getActivePublic(
    tenantId: string,
    type: CategoryType = 'income_transaction',
  ): Promise<Pick<Category, 'id' | 'name' | 'code' | 'description'>[]> {
    if (!tenantId) return [];

    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, code, description')
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[IncomeCategoryService] Error fetching public categories:', error);
      return [];
    }

    return data || [];
  }
}
