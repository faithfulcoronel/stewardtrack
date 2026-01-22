import { OpeningBalance } from '@/models/openingBalance.model';

export class OpeningBalanceValidator {
  /**
   * Validate opening balance data for creation.
   * All required fields must be present.
   */
  static validateCreate(data: Partial<OpeningBalance>): void {
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

  /**
   * Validate opening balance data for updates.
   * Only validates fields that are present in the update data.
   */
  static validateUpdate(data: Partial<OpeningBalance>): void {
    // For updates, only validate fields that are being updated
    // Don't require all fields since updates can be partial
    if (data.amount !== undefined && data.amount < 0) {
      throw new Error('Amount must be positive');
    }
    // Status transitions could be validated here if needed
  }

  /**
   * @deprecated Use validateCreate or validateUpdate instead
   */
  static validate(data: Partial<OpeningBalance>): void {
    // For backwards compatibility, use validateCreate
    // But this should be replaced with explicit calls to validateCreate/validateUpdate
    this.validateCreate(data);
  }
}
