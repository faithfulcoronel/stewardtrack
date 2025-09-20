import { BaseModel } from './base.model';
import type { FinancialSource } from './financialSource.model';

export type OpeningBalanceStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'posted'
  | 'voided';
export type OpeningBalanceSource = 'manual' | 'rollover';

export interface OpeningBalance extends BaseModel {
  id: string;
  fiscal_year_id: string;
  fund_id: string;
  source_id: string | null;
  amount: number;
  source: OpeningBalanceSource;
  status: OpeningBalanceStatus;
  header_id?: string | null;
  posted_at: string | null;
  posted_by: string | null;
  fiscal_year?: { id: string; name: string };
  fund?: { id: string; name: string; code: string };
  financial_source?: FinancialSource;
}
