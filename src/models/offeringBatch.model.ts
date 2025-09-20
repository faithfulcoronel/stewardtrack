import { BaseModel } from './base.model';

export interface OfferingBatch extends BaseModel {
  id: string;
  service_description: string | null;
  batch_date: string;
  total_amount: number;
}
