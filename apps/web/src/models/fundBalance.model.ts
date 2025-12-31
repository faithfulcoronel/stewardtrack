import { BaseModel } from '@/models/base.model';

export interface FundBalance extends BaseModel {
  id: string;
  fund_id: string;
  opening_balance: number;
  income: number;
  expenses: number;
  ending_balance: number;
}

