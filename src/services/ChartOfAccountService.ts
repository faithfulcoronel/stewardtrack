import { injectable, inject } from 'inversify';
import type { IChartOfAccountRepository } from '../repositories/chartOfAccount.repository';
import type { ChartOfAccount } from '../models/chartOfAccount.model';
import type { QueryOptions } from '../adapters/base.adapter';
import { TYPES } from '../lib/types';
import type { CrudService } from './CrudService';
import { ChartOfAccountValidator } from '../validators/chartOfAccount.validator';
import { validateOrThrow } from '../utils/validation';
import type { IFinancialTransactionRepository } from '../repositories/financialTransaction.repository';
import { calculateAccountBalance } from '../utils/accounting';

@injectable()
export class ChartOfAccountService implements CrudService<ChartOfAccount> {
  constructor(
    @inject(TYPES.IChartOfAccountRepository)
    private repository: IChartOfAccountRepository,
    @inject(TYPES.IFinancialTransactionRepository)
    private transactionRepo: IFinancialTransactionRepository,
  ) {}

  find(options: QueryOptions = {}) {
    return this.repository.find(options);
  }

  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repository.findAll(options);
  }

  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repository.findById(id, options);
  }

  findByCode(code: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repository.findByCode(code, options);
  }

  create(
    data: Partial<ChartOfAccount>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(ChartOfAccountValidator, data);
    return this.repository.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<ChartOfAccount>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(ChartOfAccountValidator, data);
    return this.repository.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }

  getHierarchy() {
    return this.repository.getHierarchy();
  }

  async getBalance(id: string) {
    const account = await this.repository.findById(id, {
      select: 'id, account_type',
    });
    if (!account) {
      throw new Error('Account not found');
    }
    const { data: transactions } = await this.transactionRepo.findAll({
      select: 'debit, credit',
      filters: { account_id: { operator: 'eq', value: id } },
    });
    const balance = calculateAccountBalance(
      (account as any).account_type,
      transactions,
    );
    return { balance, as_of: new Date().toISOString() };
  }

  async getTransactions(id: string, from?: string, to?: string) {
    const filters: Record<string, any> = {
      account_id: { operator: 'eq', value: id },
    };
    if (from || to) {
      filters.date = { operator: 'between', value: from, valueTo: to };
    }
    const { data } = await this.transactionRepo.findAll({
      filters,
      order: { column: 'date', ascending: false },
    });

    return data.map(tx => ({
      date: tx.date,
      transaction_number: tx.header?.transaction_number ?? null,
      description: tx.description,
      amount: tx.debit ?? tx.credit ?? 0,
      transaction_type: tx.debit && !tx.credit ? 'debit' : 'credit',
      status: tx.header?.status ?? null,
    }));
  }
}
