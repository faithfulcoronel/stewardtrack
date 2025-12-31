import { BaseModel } from '@/models/base.model';
import type { ChartOfAccount } from '@/models/chartOfAccount.model';

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
