import { FinancialTransactionHeader } from '../models/financialTransactionHeader.model';

export class FinancialTransactionHeaderValidator {
  static validate(data: Partial<FinancialTransactionHeader>): void {
    if (data.transaction_date !== undefined && !data.transaction_date) {
      throw new Error('Transaction date is required');
    }

    if (data.description !== undefined && !data.description.trim()) {
      throw new Error('Description is required');
    }

    if (data.status !== undefined) {
      const validStatuses = [
        'draft',
        'submitted',
        'approved',
        'posted',
        'voided'
      ];
      if (!validStatuses.includes(data.status)) {
        throw new Error(
          'Invalid status. Must be one of: draft, submitted, approved, posted, voided'
        );
      }
    }
  }
}
