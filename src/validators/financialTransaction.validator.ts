import { FinancialTransaction } from '../models/financialTransaction.model';

export class FinancialTransactionValidator {
  static validate(data: Partial<FinancialTransaction>): void {
    if (data.date !== undefined && !data.date) {
      throw new Error('Transaction date is required');
    }

    if (data.description !== undefined && !data.description.trim()) {
      throw new Error('Description is required');
    }

    if (
      data.debit !== undefined &&
      data.credit !== undefined &&
      data.debit > 0 &&
      data.credit > 0
    ) {
      throw new Error('Debit and credit cannot both be greater than zero');
    }
  }
}
