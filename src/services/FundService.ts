import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { IFundRepository } from '../repositories/fund.repository';
import type { IFundBalanceRepository } from '../repositories/fundBalance.repository';
import type { Fund } from '../models/fund.model';
import type { ChartOfAccount } from '../models/chartOfAccount.model';
import { ChartOfAccountService } from './ChartOfAccountService';
import { QueryOptions } from '../adapters/base.adapter';
import type { CrudService } from './CrudService';
import { FundValidator } from '../validators/fund.validator';
import { validateOrThrow } from '../utils/validation';
import { tenantUtils } from '../utils/tenantUtils';

export interface FundRelations {
  [key: string]: string[];
}

export type FundService = CrudService<Fund> & {
  getBalance(id: string): Promise<number>;
  getActive(): Promise<Fund[]>;
  createEquityAccount(fundName: string): Promise<ChartOfAccount>;
  createWithAccount(
    data: Partial<Fund>,
    relations?: FundRelations,
    fieldsToRemove?: string[],
  ): Promise<Fund>;
  updateWithAccountCheck(
    id: string,
    data: Partial<Fund>,
    relations?: FundRelations,
    fieldsToRemove?: string[],
  ): Promise<Fund>;
};

@injectable()
export class DefaultFundService implements FundService {
  constructor(
    @inject(TYPES.IFundRepository) private repo: IFundRepository,
    @inject(TYPES.IFundBalanceRepository) private balanceRepo: IFundBalanceRepository,
    @inject(TYPES.ChartOfAccountService) private coaService: ChartOfAccountService,
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
    data: Partial<Fund>,
    relations?: FundRelations,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(FundValidator, data);
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<Fund>,
    relations?: FundRelations,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(FundValidator, data);
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }

  getBalance(id: string) {
    return this.balanceRepo.getBalance(id);
  }

  async getActive(): Promise<Fund[]> {

    const options: Omit<QueryOptions, 'pagination'> = {
      select: 'id,name',
      order: { column: 'name', ascending: true },
    };

    const { data } = await this.repo.findAll(options);
    return data;
  }

  async createEquityAccount(fundName: string): Promise<ChartOfAccount> {
    const equityRoot = await this.coaService.findByCode('3000');

    const equityRootId = equityRoot?.id ?? null;

    const { data: maxCodeRows } = await this.coaService.find({
      select: 'code',
      filters: { code: { operator: 'startsWith', value: '3' } },
      order: { column: 'code', ascending: false },
      pagination: { page: 1, pageSize: 1 },
    });

    const nextCode = maxCodeRows?.[0]
      ? String(Number(maxCodeRows[0].code) + 1)
      : '3100';

    return this.coaService.create(
      {
        code: nextCode,
        name: `${fundName} Equity`,
        account_type: 'equity',
        parent_id: equityRootId,
      },
      undefined,
      ['chart_of_accounts']
    );
  }

  async createWithAccount(
    data: Partial<Fund>,
    relations?: FundRelations,
    fieldsToRemove: string[] = [],
  ): Promise<Fund> {
    const payload = { ...data };
    if (!payload.coa_id && payload.name) {
      const account = await this.createEquityAccount(payload.name);
      payload.coa_id = account.id;
    }
    return this.create(payload, relations, fieldsToRemove);
  }

  async updateWithAccountCheck(
    id: string,
    data: Partial<Fund>,
    relations?: FundRelations,
    fieldsToRemove: string[] = [],
  ): Promise<Fund> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Fund not found');
    const existingFund = existing;
    if (existingFund.coa_id && data.coa_id && data.coa_id !== existingFund.coa_id) {
      throw new Error('Equity account cannot be changed');
    }
    if (data.coa_id === undefined) {
      const { coa_id: _removed, ...rest } = data;
      data = rest;
    }
    return this.update(id, data, relations, fieldsToRemove);
  }
}
