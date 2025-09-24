import { BaseModel } from '@/models/base.model';
import { Fund } from '@/models/fund.model';
import { FinancialSource } from '@/models/financialSource.model';
import { Account } from '@/models/account.model';
import type { TransactionType } from '@/models/financialTransaction.model';
import type { FinancialTransactionHeader } from '@/models/financialTransactionHeader.model';

export interface IncomeExpenseTransaction extends BaseModel {
  id: string;
  transaction_type: TransactionType;
  transaction_date: string;
  amount: number;
  description: string;
  reference: string | null;
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
