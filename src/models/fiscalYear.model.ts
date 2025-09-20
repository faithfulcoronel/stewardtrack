import { BaseModel } from './base.model';

export type FiscalYearStatus = 'open' | 'closed';

export interface FiscalYear extends BaseModel {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: FiscalYearStatus;
  closed_at: string | null;
  closed_by: string | null;
}
