import { IncomeExpenseTransaction } from '../models/incomeExpenseTransaction.model';

export class IncomeExpenseTransactionValidator {
  static validate(data: Partial<IncomeExpenseTransaction>): void {
    if (data.transaction_date !== undefined && !data.transaction_date) {
      throw new Error('Transaction date is required');
    }
    // Description is optional for individual income/expense entries.
    // When not provided or blank, it will default to the header description at
    // the service layer, so no validation error should be raised here.
    if (
      data.amount !== undefined &&
      (isNaN(Number(data.amount)) || data.amount === null)
    ) {
      throw new Error('Amount must be a valid number');
    }

    if (
      data.line !== undefined &&
      (isNaN(Number(data.line)) || data.line === null)
    ) {
      throw new Error('Line must be a valid number');
    }
  }
}
