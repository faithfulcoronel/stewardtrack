import { BaseModel } from './base.model';

export interface Budget extends BaseModel {
  id: string;
  name: string;
  amount: number;
  category_id: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  category?: {
    id: string;
    name: string;
  };
}
