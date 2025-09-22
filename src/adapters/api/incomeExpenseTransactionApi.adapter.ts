import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { apiClient } from '../../lib/apiClient';
import { IncomeExpenseTransaction } from '../../models/incomeExpenseTransaction.model';
import type { IIncomeExpenseTransactionAdapter } from '../incomeExpenseTransaction.adapter';


@injectable()
export class IncomeExpenseTransactionApiAdapter
  extends ApiBaseAdapter<IncomeExpenseTransaction>
  implements IIncomeExpenseTransactionAdapter
{
  protected basePath = '/incomeexpensetransactions';

  protected mapFromApi(data: any): IncomeExpenseTransaction {
    return {
      id: data.id ?? data.Id,
      transaction_type: data.transaction_type ?? data.TransactionType,
      transaction_date: data.transaction_date ?? data.TransactionDate,
      amount: data.amount ?? data.Amount,
      description: data.description ?? data.Description,
      reference: data.reference ?? data.Reference ?? null,
      member_id: data.member_id ?? data.MemberId ?? null,
      category_id: data.category_id ?? data.CategoryId ?? null,
      fund_id: data.fund_id ?? data.FundId ?? null,
      source_id: data.source_id ?? data.SourceId ?? null,
      account_id: data.account_id ?? data.AccountId ?? null,
      header_id: data.header_id ?? data.HeaderId ?? null,
      line: data.line ?? data.Line ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as IncomeExpenseTransaction;
  }

  protected mapToApi(data: Partial<IncomeExpenseTransaction>) {
    return {
      id: data.id,
      transactionType: data.transaction_type,
      transactionDate: data.transaction_date,
      amount: data.amount,
      description: data.description,
      reference: data.reference,
      memberId: data.member_id,
      categoryId: data.category_id,
      fundId: data.fund_id,
      sourceId: data.source_id,
      accountId: data.account_id,
      headerId: data.header_id,
      line: data.line,
    };
  }

  async getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]> {
    const params = new URLSearchParams({ headerId });
    const data = await apiClient.get<IncomeExpenseTransaction[]>(
      `${this.basePath}?${params.toString()}`
    );
    return data ?? [];
  }
}
