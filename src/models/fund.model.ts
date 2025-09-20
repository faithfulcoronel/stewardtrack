import { BaseModel } from './base.model';
import type { ChartOfAccount } from './chartOfAccount.model';

export type FundType = 'restricted' | 'unrestricted';

export interface Fund extends BaseModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: FundType;
  coa_id: string | null;
  chart_of_accounts?: ChartOfAccount;
}
