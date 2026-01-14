import { BaseModel } from '@/models/base.model';
import { FinancialSource } from '@/models/financialSource.model';
import { FinancialTransaction, TransactionType } from '@/models/financialTransaction.model';

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
  transaction_type?: TransactionType;
  description: string;
  reference: string | null;
  source_id: string | null;
  source?: FinancialSource;
  status: TransactionStatus;
  submitted_at?: string | null;
  submitted_by?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  posted_at: string | null;
  posted_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  transactions?: FinancialTransaction[];
}