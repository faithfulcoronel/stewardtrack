import { BaseModel } from './base.model';

export interface LicensePlan extends BaseModel {
  id: string;
  name: string;
  tier: string;
  description?: string | null;
}
