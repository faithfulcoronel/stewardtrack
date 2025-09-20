import { BaseModel } from './base.model';

export interface IncomeExpenseTransactionMapping extends BaseModel {
  id: string;
  transaction_id: string;
  transaction_header_id: string;
  debit_transaction_id: string | null;
  credit_transaction_id: string | null;
}
