import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFiscalYearRepository } from '@/repositories/fiscalYear.repository';
import type { FiscalYear } from '@/models/fiscalYear.model';
import type { QueryOptions } from '@/adapters/base.adapter';
import type { CrudService } from '@/services/CrudService';

@injectable()
export class FiscalYearService implements CrudService<FiscalYear> {
  constructor(
    @inject(TYPES.IFiscalYearRepository)
    private repo: IFiscalYearRepository,
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
    data: Partial<FiscalYear>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<FiscalYear>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}

