import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { FinancialTransaction } from '../../models/financialTransaction.model';
import type { IFinancialTransactionAdapter } from '../financialTransaction.adapter';


@injectable()
export class FinancialTransactionApiAdapter
  extends ApiBaseAdapter<FinancialTransaction>
  implements IFinancialTransactionAdapter
{
  protected basePath = '/financialtransactions';

  protected mapFromApi(data: any): FinancialTransaction {
    return {
      id: data.id ?? data.Id,
      type: data.type ?? data.Type ?? null,
      description: data.description ?? data.Description,
      date: data.date ?? data.Date,
      member_id: data.member_id ?? data.MemberId ?? null,
      category_id: data.category_id ?? data.CategoryId ?? null,
      fund_id: data.fund_id ?? data.FundId ?? null,
      batch_id: data.batch_id ?? data.BatchId ?? null,
      account_id: data.account_id ?? data.AccountId ?? null,
      header_id: data.header_id ?? data.HeaderId ?? null,
      debit: data.debit ?? data.Debit,
      credit: data.credit ?? data.Credit,
      is_reconciled: data.is_reconciled ?? data.IsReconciled,
      reconciled_at: data.reconciled_at ?? data.ReconciledAt ?? null,
      reconciled_by: data.reconciled_by ?? data.ReconciledBy ?? null,
      source_id: data.source_id ?? data.SourceId ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as FinancialTransaction;
  }

  protected mapToApi(data: Partial<FinancialTransaction>) {
    return {
      id: data.id,
      type: data.type,
      description: data.description,
      date: data.date,
      memberId: data.member_id,
      categoryId: data.category_id,
      fundId: data.fund_id,
      batchId: data.batch_id,
      accountId: data.account_id,
      headerId: data.header_id,
      debit: data.debit,
      credit: data.credit,
      isReconciled: data.is_reconciled,
      reconciledAt: data.reconciled_at,
      reconciledBy: data.reconciled_by,
      sourceId: data.source_id,
    };
  }
}
