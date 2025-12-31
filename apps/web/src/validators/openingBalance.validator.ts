import { OpeningBalance } from '@/models/openingBalance.model';

export class OpeningBalanceValidator {
  static validate(data: Partial<OpeningBalance>): void {
    if (!data.fiscal_year_id) {
      throw new Error('Fiscal year is required');
    }
    if (!data.fund_id) {
      throw new Error('Fund is required');
    }
    if (!data.source_id) {
      throw new Error('Financial source is required');
    }
    if (data.amount !== undefined && data.amount < 0) {
      throw new Error('Amount must be positive');
    }
  }
}
