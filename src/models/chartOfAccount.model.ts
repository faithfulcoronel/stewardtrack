import { BaseModel } from './base.model';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface ChartOfAccount extends BaseModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  account_type: AccountType;
  account_subtype: string | null;
  is_active: boolean;
  parent_id: string | null;
  parent?: ChartOfAccount;
  children?: ChartOfAccount[];
}