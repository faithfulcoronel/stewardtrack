import { ChartOfAccount } from '../models/chartOfAccount.model';

export class ChartOfAccountValidator {
  static validate(data: Partial<ChartOfAccount>): void {
    if (data.code !== undefined && !data.code.trim()) {
      throw new Error('Account code is required');
    }

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Account name is required');
    }

    if (data.account_type !== undefined) {
      const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
      if (!validTypes.includes(data.account_type)) {
        throw new Error('Invalid account type. Must be one of: asset, liability, equity, revenue, expense');
      }
    }
  }
}
