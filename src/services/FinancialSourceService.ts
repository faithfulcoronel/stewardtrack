import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { IFinancialSourceRepository } from '../repositories/financialSource.repository';
import type { FinancialSource } from '../models/financialSource.model';
import type { ChartOfAccount } from '../models/chartOfAccount.model';
import type { QueryOptions } from '../adapters/base.adapter';
import { ChartOfAccountService } from './ChartOfAccountService';
import { uniqueID } from '../lib/helpers';
import type { CrudService } from './CrudService';
import { FinancialSourceValidator } from '../validators/financialSource.validator';
import { validateOrThrow } from '../utils/validation';

@injectable()
export class FinancialSourceService
  implements CrudService<FinancialSource> {
  constructor(
    @inject(TYPES.IFinancialSourceRepository)
    private repo: IFinancialSourceRepository,
    @inject(TYPES.ChartOfAccountService)
    private coaService: ChartOfAccountService,
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
    data: Partial<FinancialSource>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(FinancialSourceValidator, data);
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<FinancialSource>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(FinancialSourceValidator, data);
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  async createAssetAccount(name: string): Promise<ChartOfAccount> {
    const assetRoot = await this.coaService.findByCode('1000');
    if (!assetRoot) {
      throw new Error('Assets account not found');
    }
    return this.coaService.create(
      {
        code: uniqueID(),
        name,
        account_type: 'asset',
        parent_id: assetRoot.id,
        is_active: true,
      },
      undefined,
      ['chart_of_accounts'],
    );
  }

  async createWithAccount(
    data: Partial<FinancialSource> & { auto_create?: boolean },
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ): Promise<FinancialSource> {
    const { auto_create, ...rest } = data as any;
    const payload = { ...rest } as Partial<FinancialSource>;
    if (auto_create && !payload.coa_id && payload.name) {
      const account = await this.createAssetAccount(payload.name);
      payload.coa_id = account.id;
    }
    return this.create(payload, relations, fieldsToRemove);
  }

  async updateWithAccountCheck(
    id: string,
    data: Partial<FinancialSource> & { auto_create?: boolean },
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ): Promise<FinancialSource> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Financial source not found');
    const existingSource = (existing as any as FinancialSource) ?? existing;

    const { auto_create, ...rest } = data as any;

    if (existingSource.coa_id && rest.coa_id && rest.coa_id !== existingSource.coa_id) {
      throw new Error('Chart of account cannot be changed');
    }

    if (!existingSource.coa_id && auto_create && !rest.coa_id && rest.name) {
      const account = await this.createAssetAccount(rest.name);
      rest.coa_id = account.id;
    }

    if (rest.coa_id === undefined) {
      const { coa_id, ...remaining } = rest as any;
      return this.update(id, remaining, relations, fieldsToRemove);
    }

    return this.update(id, rest, relations, fieldsToRemove);
  }
}
