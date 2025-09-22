import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IBudgetRepository } from '@/repositories/budget.repository';
import { Budget } from '@/models/budget.model';
import { QueryOptions } from '@/adapters/base.adapter';
import type { CrudService } from '@/services/CrudService';

export type BudgetService = CrudService<Budget>;

@injectable()
export class DefaultBudgetService implements BudgetService {
  constructor(@inject(TYPES.IBudgetRepository) private repo: IBudgetRepository) {}

  find(options: QueryOptions = {}) {
    return this.repo.find(options);
  }

  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll(options);
  }

  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  create(data: Partial<Budget>, relations?: Record<string, any[]>, fieldsToRemove: string[] = []) {
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(id: string, data: Partial<Budget>, relations?: Record<string, any[]>, fieldsToRemove: string[] = []) {
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}
