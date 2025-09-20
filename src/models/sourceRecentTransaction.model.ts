import { BaseModel } from './base.model';

export interface SourceRecentTransaction extends BaseModel {
  header_id: string;
  source_id: string;
  account_id: string;
  fund_id?: string | null;
  date: string;
  category: string | null;
  description: string | null;
  amount: number;
}
