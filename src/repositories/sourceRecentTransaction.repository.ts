import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { SourceRecentTransaction } from '../models/sourceRecentTransaction.model';
import type { ISourceRecentTransactionAdapter } from '../adapters/sourceRecentTransaction.adapter';

export interface ISourceRecentTransactionRepository {
  getRecentTransactions(accountId: string, limit?: number): Promise<SourceRecentTransaction[]>;
  getRecentTransactionsByFund(fundId: string, limit?: number): Promise<SourceRecentTransaction[]>;
  getBalance(accountId: string): Promise<number>;
  getBalanceByFund(fundId: string): Promise<number>;
}

@injectable()
export class SourceRecentTransactionRepository implements ISourceRecentTransactionRepository {
  constructor(
    @inject(TYPES.ISourceRecentTransactionAdapter)
    private adapter: ISourceRecentTransactionAdapter
  ) {}

  async getRecentTransactions(accountId: string, limit = 5) {
    const rows = await this.adapter.fetchRecent(accountId, limit);
    return rows.map((r: any) => ({
      header_id: r.header_id,
      source_id: r.source_id,
      account_id: r.account_id,
      fund_id: r.fund_id ?? null,
      date: r.date,
      category: r.category ?? null,
      description: r.description ?? null,
      amount: Number(r.amount)
    })) as SourceRecentTransaction[];
  }

  async getRecentTransactionsByFund(fundId: string, limit = 5) {
    const rows = await this.adapter.fetchRecentByFund(fundId, limit);
    return rows.map((r: any) => ({
      header_id: r.header_id,
      source_id: r.source_id,
      account_id: r.account_id,
      fund_id: r.fund_id ?? null,
      date: r.date,
      category: r.category ?? null,
      description: r.description ?? null,
      amount: Number(r.amount)
    })) as SourceRecentTransaction[];
  }

  async getBalance(accountId: string) {
    const balance = await this.adapter.fetchBalance(accountId);
    return Number(balance) || 0;
  }

  async getBalanceByFund(fundId: string) {
    const amounts = await this.adapter.fetchBalanceByFund(fundId);
    return amounts.reduce((sum: number, a: any) => sum + Number(a), 0);
  }
}
