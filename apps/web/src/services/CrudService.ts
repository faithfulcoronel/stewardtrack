import 'server-only';
import type { QueryOptions } from '@/adapters/base.adapter';

/**
 * Generic CRUD service interface implemented by data services.
 */
export interface CrudService<T> {
  find(options?: QueryOptions): any;
  findAll(options?: Omit<QueryOptions, 'pagination'>): any;
  findById(id: string, options?: Omit<QueryOptions, 'pagination'>): any;
  create(
    data: Partial<T>,
    relations?: Record<string, any[]>,
    fieldsToRemove?: string[],
  ): Promise<T>;
  update(
    id: string,
    data: Partial<T>,
    relations?: Record<string, any[]>,
    fieldsToRemove?: string[],
  ): Promise<T>;
  delete(id: string): Promise<void>;
}
