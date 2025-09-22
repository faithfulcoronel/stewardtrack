import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { apiClient } from '../../lib/apiClient';
import { IncomeExpenseTransactionMapping } from '../../models/incomeExpenseTransactionMapping.model';
import type { IIncomeExpenseTransactionMappingAdapter } from '../incomeExpenseTransactionMapping.adapter';


@injectable()
export class IncomeExpenseTransactionMappingApiAdapter
  extends ApiBaseAdapter<IncomeExpenseTransactionMapping>
  implements IIncomeExpenseTransactionMappingAdapter
{
  protected basePath = '/incomeexpensetransactionmappings';

  protected mapFromApi(data: any): IncomeExpenseTransactionMapping {
    return {
      id: data.id ?? data.Id,
      transaction_id: data.transaction_id ?? data.TransactionId,
      transaction_header_id: data.transaction_header_id ?? data.TransactionHeaderId,
      debit_transaction_id: data.debit_transaction_id ?? data.DebitTransactionId ?? null,
      credit_transaction_id: data.credit_transaction_id ?? data.CreditTransactionId ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as IncomeExpenseTransactionMapping;
  }

  protected mapToApi(data: Partial<IncomeExpenseTransactionMapping>) {
    return {
      id: data.id,
      transactionId: data.transaction_id,
      transactionHeaderId: data.transaction_header_id,
      debitTransactionId: data.debit_transaction_id,
      creditTransactionId: data.credit_transaction_id,
    };
  }

  async getByTransactionId(
    id: string
  ): Promise<IncomeExpenseTransactionMapping[]> {
    const params = new URLSearchParams({ transactionId: id });
    const data = await apiClient.get<IncomeExpenseTransactionMapping[]>(
      `${this.basePath}?${params.toString()}`
    );
    return data ?? [];
  }

  async getByHeaderId(id: string): Promise<IncomeExpenseTransactionMapping[]> {
    const params = new URLSearchParams({ transactionHeaderId: id });
    const data = await apiClient.get<IncomeExpenseTransactionMapping[]>(
      `${this.basePath}?${params.toString()}`
    );
    return data ?? [];
  }
}
