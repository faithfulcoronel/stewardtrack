import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { FinancialTransactionHeader } from '../../models/financialTransactionHeader.model';
import type { IFinancialTransactionHeaderAdapter } from '../financialTransactionHeader.adapter';
import { apiClient } from '../../lib/apiClient';
import { camelToSnakeCaseObject } from '../../utils/String';


@injectable()
export class FinancialTransactionHeaderApiAdapter
  extends ApiBaseAdapter<FinancialTransactionHeader>
  implements IFinancialTransactionHeaderAdapter
{
  protected basePath = '/financialtransactionheaders';

  protected mapFromApi(data: any): FinancialTransactionHeader {
    return {
      id: data.id ?? data.Id,
      transaction_number: data.transaction_number ?? data.TransactionNumber,
      transaction_date: data.transaction_date ?? data.TransactionDate,
      description: data.description ?? data.Description,
      reference: data.reference ?? data.Reference ?? null,
      source_id: data.source_id ?? data.SourceId ?? null,
      status: data.status ?? data.Status,
      posted_at: data.posted_at ?? data.PostedAt ?? null,
      posted_by: data.posted_by ?? data.PostedBy ?? null,
      voided_at: data.voided_at ?? data.VoidedAt ?? null,
      voided_by: data.voided_by ?? data.VoidedBy ?? null,
      void_reason: data.void_reason ?? data.VoidReason ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as FinancialTransactionHeader;
  }

  protected mapToApi(data: Partial<FinancialTransactionHeader>) {
    return {
      id: data.id,
      transactionNumber: data.transaction_number,
      transactionDate: data.transaction_date,
      description: data.description,
      reference: data.reference,
      sourceId: data.source_id,
      status: data.status,
      postedAt: data.posted_at,
      postedBy: data.posted_by,
      voidedAt: data.voided_at,
      voidedBy: data.voided_by,
      voidReason: data.void_reason,
    };
  }

  async postTransaction(id: string): Promise<void> {
    await apiClient.post<void>(`${this.basePath}/${id}/post`, {});
  }

  async submitTransaction(id: string): Promise<void> {
    await apiClient.post<void>(`${this.basePath}/${id}/submit`, {});
  }

  async approveTransaction(id: string): Promise<void> {
    await apiClient.post<void>(`${this.basePath}/${id}/approve`, {});
  }

  async voidTransaction(id: string, reason: string): Promise<void> {
    await apiClient.post<void>(`${this.basePath}/${id}/void`, { reason });
  }

  async getTransactionEntries(headerId: string): Promise<any[]> {
    const data = await apiClient.get<any[]>(
      `${this.basePath}/${headerId}/entries`
    );
    return data ?? [];
  }

  async isTransactionBalanced(headerId: string): Promise<boolean> {
    const data = await apiClient.get<{ balanced: boolean }>(
      `${this.basePath}/${headerId}/balanced`
    );
    return data?.balanced ?? false;
  }

  async createWithTransactions(
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }> {
    const payload = camelToSnakeCaseObject({
      header: this.mapToApi(data),
      transactions,
    });
    const result = await apiClient.post<{
      header: any;
      transactions: any[];
    }>(`${this.basePath}/with-transactions`, payload);
    if (!result) {
      throw new Error('Failed to create transaction');
    }
    return {
      header: this.mapFromApi(result.header),
      transactions: result.transactions ?? [],
    };
  }

  async updateWithTransactions(
    id: string,
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }> {
    const payload = camelToSnakeCaseObject({
      header: this.mapToApi(data),
      transactions,
    });
    const result = await apiClient.put<{
      header: any;
      transactions: any[];
    }>(`${this.basePath}/${id}/with-transactions`, payload);
    if (!result) {
      throw new Error('Failed to update transaction');
    }
    return {
      header: this.mapFromApi(result.header),
      transactions: result.transactions ?? [],
    };
  }

  async getUnmappedHeaders(): Promise<FinancialTransactionHeader[]> {
    const data = await apiClient.get<any[]>(`${this.basePath}/unmapped`);
    return Array.isArray(data) ? data.map((d) => this.mapFromApi(d)) : [];
  }
}
