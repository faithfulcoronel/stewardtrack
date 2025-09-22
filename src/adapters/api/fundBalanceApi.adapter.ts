import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { apiClient } from '../../lib/apiClient';
import { FundBalance } from '../../models/fundBalance.model';
import type { IFundBalanceAdapter } from '../fundBalance.adapter';


@injectable()
export class FundBalanceApiAdapter
  extends ApiBaseAdapter<FundBalance>
  implements IFundBalanceAdapter
{
  protected basePath = '/fundbalances';

  protected mapFromApi(data: any): FundBalance {
    return {
      id: data.id ?? data.Id,
      fund_id: data.fund_id ?? data.FundId,
      opening_balance: data.opening_balance ?? data.OpeningBalance,
      income: data.income ?? data.Income,
      expenses: data.expenses ?? data.Expenses,
      ending_balance: data.ending_balance ?? data.EndingBalance,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as FundBalance;
  }

  protected mapToApi(data: Partial<FundBalance>) {
    return {
      id: data.id,
      fundId: data.fund_id,
      openingBalance: data.opening_balance,
      income: data.income,
      expenses: data.expenses,
      endingBalance: data.ending_balance,
    };
  }

  async fetchBalance(
    fundId: string,
  ): Promise<{ balance: number } | null> {
    const data = await apiClient.get<{ balance: number }>(
      `${this.basePath}/${fundId}/balance`
    );
    return data ?? null;
  }
}
