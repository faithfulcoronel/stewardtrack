import { IncomeExpenseTransactionMapping } from '../models/incomeExpenseTransactionMapping.model';

export class IncomeExpenseTransactionMappingValidator {
  static validate(data: Partial<IncomeExpenseTransactionMapping>): void {
    if (data.transaction_id !== undefined && !data.transaction_id) {
      throw new Error('transaction_id is required');
    }
    if (data.transaction_header_id !== undefined && !data.transaction_header_id) {
      throw new Error('transaction_header_id is required');
    }
  }
}
