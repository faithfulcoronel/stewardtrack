import { BaseModel } from './base.model';
import type { ChartOfAccount } from './chartOfAccount.model';

export type SourceType = 'bank' | 'fund' | 'wallet' | 'cash' | 'online' | 'other';

export interface FinancialSource extends BaseModel {
  id: string;
  name: string;
  description: string | null;
  source_type: SourceType;
  account_number: string | null;
  coa_id: string | null;
  chart_of_accounts?: ChartOfAccount;
  is_active: boolean;
}