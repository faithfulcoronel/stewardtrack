import { BaseModel } from '@/models/base.model';

export interface LicensePlan extends BaseModel {
  id: string;
  name: string;
  tier: string;
  description?: string | null;
}
