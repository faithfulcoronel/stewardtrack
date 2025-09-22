import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { apiClient } from '../../lib/apiClient';
import { SourceRecentTransaction } from '../../models/sourceRecentTransaction.model';
import type { ISourceRecentTransactionAdapter } from '../sourceRecentTransaction.adapter';


@injectable()
export class SourceRecentTransactionApiAdapter
  extends ApiBaseAdapter<SourceRecentTransaction>
  implements ISourceRecentTransactionAdapter
{
  protected basePath = '/sourcerecenttransactions';

  protected mapFromApi(data: any): SourceRecentTransaction {
    return {
      id: data.id ?? data.Id,
      header_id: data.header_id ?? data.HeaderId,
      source_id: data.source_id ?? data.SourceId,
      account_id: data.account_id ?? data.AccountId,
      fund_id: data.fund_id ?? data.FundId ?? null,
      date: data.date ?? data.Date,
      category: data.category ?? data.Category ?? null,
      description: data.description ?? data.Description ?? null,
      amount: data.amount ?? data.Amount,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as SourceRecentTransaction;
  }

  protected mapToApi(data: Partial<SourceRecentTransaction>) {
    return {
      id: data.id,
      headerId: data.header_id,
      sourceId: data.source_id,
      accountId: data.account_id,
      fundId: data.fund_id,
      date: data.date,
      category: data.category,
      description: data.description,
      amount: data.amount,
    };
  }

  async fetchRecent(
    accountId: string,
    limit = 5,
  ): Promise<SourceRecentTransaction[]> {
    const params = new URLSearchParams({
      accountId,
      limit: String(limit)
    });
    const data = await apiClient.get<SourceRecentTransaction[]>(
      `${this.basePath}/recent?${params.toString()}`
    );
    return data ?? [];
  }

  async fetchRecentByFund(
    fundId: string,
    limit = 5,
  ): Promise<SourceRecentTransaction[]> {
    const params = new URLSearchParams({
      fundId,
      limit: String(limit)
    });
    const data = await apiClient.get<SourceRecentTransaction[]>(
      `${this.basePath}/recent-by-fund?${params.toString()}`
    );
    return data ?? [];
  }

  async fetchBalance(accountId: string): Promise<number> {
    const params = new URLSearchParams({ accountId });
    const data = await apiClient.get<{ balance: number }>(
      `${this.basePath}/balance?${params.toString()}`
    );
    return data?.balance ?? 0;
  }

  async fetchBalanceByFund(fundId: string): Promise<number[]> {
    const params = new URLSearchParams({ fundId });
    const data = await apiClient.get<number[]>(
      `${this.basePath}/balance-by-fund?${params.toString()}`
    );
    return data ?? [];
  }
}
