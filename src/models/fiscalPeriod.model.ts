import { BaseModel } from './base.model';
import type { FiscalYear } from './fiscalYear.model';

export type FiscalPeriodStatus = 'open' | 'closed';

export interface FiscalPeriod extends BaseModel {
  id: string;
  tenant_id: string;
  fiscal_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: FiscalPeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  fiscal_year?: Pick<FiscalYear, 'id' | 'name'>;
}
