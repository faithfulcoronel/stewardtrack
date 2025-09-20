import { BaseModel } from './base.model';
import { Member } from './member.model';
import { Fund } from './fund.model';
import { FinancialSource } from './financialSource.model';
import { Account } from './account.model';
import type { TransactionType } from './financialTransaction.model';
import type { FinancialTransactionHeader } from './financialTransactionHeader.model';

export interface IncomeExpenseTransaction extends BaseModel {
  id: string;
  transaction_type: TransactionType;
  transaction_date: string;
  amount: number;
  description: string;
  reference: string | null;
  member_id: string | null;
  member?: Member;
  category_id: string | null;
  category?: {
    id: string;
    name: string;
    code: string;
  };
  fund_id: string | null;
  fund?: Fund;
  source_id: string | null;
  source?: FinancialSource;
  account_id: string | null;
  account?: Account;
  header_id: string | null;
  header?: FinancialTransactionHeader;
  line: number | null;
}
