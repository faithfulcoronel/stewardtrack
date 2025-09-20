import { BaseModel } from './base.model';
import { FinancialSource } from './financialSource.model';
import { FinancialTransaction } from './financialTransaction.model';

export type TransactionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'posted'
  | 'voided';

export interface FinancialTransactionHeader extends BaseModel {
  id: string;
  transaction_number: string;
  transaction_date: string;
  description: string;
  reference: string | null;
  source_id: string | null;
  source?: FinancialSource;
  status: TransactionStatus;
  posted_at: string | null;
  posted_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  transactions?: FinancialTransaction[];
}