import { BaseModel } from './base.model';
import { Member } from './member.model';
import { ChartOfAccount } from './chartOfAccount.model';
import { FinancialTransactionHeader } from './financialTransactionHeader.model';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'adjustment'
  | 'opening_balance'
  | 'closing_entry'
  | 'fund_rollover'
  | 'reversal'
  | 'allocation'
  | 'reclass'
  | 'refund';

export interface FinancialTransaction extends BaseModel {
  id: string;
  type: TransactionType | null;
  description: string;
  date: string;
  budget_id: string | null;
  member_id: string | null;
  member?: Member;
  category_id: string | null;
  category?: {
    id: string;
    name: string;
    code: string;
  };
  fund_id: string | null;
  fund?: {
    id: string;
    name: string;
    code: string;
  };
  batch_id: string | null;
  batch?: {
    id: string;
    service_description: string | null;
    batch_date: string;
    total_amount: number;
  };
  account_id: string | null;
  accounts_account_id: string | null;
  account_holder?: { id: string; name: string };
  account?: ChartOfAccount;
  header_id: string | null;
  header?: FinancialTransactionHeader;
  debit: number;
  credit: number;
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  source_id: string | null;
  source?: {
    id: string;
    name: string;
    source_type: string;
  };
}