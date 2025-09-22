import { Account } from '../models/account.model';

export class AccountValidator {
  static validate(data: Partial<Account>): void {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Account name is required');
    }

    if (data.account_number !== undefined && !data.account_number.trim()) {
      throw new Error('Account number is required');
    }

    if (data.account_type !== undefined &&
        !['organization', 'person'].includes(data.account_type)) {
      throw new Error('Account type must be either "organization" or "person"');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Invalid email format');
    }
  }
}
