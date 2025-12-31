import { FinancialSource } from '@/models/financialSource.model';

export class FinancialSourceValidator {
  static validate(data: Partial<FinancialSource>): void {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Source name is required');
    }

    if (!data.coa_id?.trim()) {
      throw new Error('Chart of Account ID is required');
    }

    if (data.source_type !== undefined) {
      const validTypes = ['bank', 'fund', 'wallet', 'cash', 'online', 'other'];
      if (!validTypes.includes(data.source_type)) {
        throw new Error('Invalid source type. Must be one of: bank, fund, wallet, cash, online, other');
      }
    }
  }
}
