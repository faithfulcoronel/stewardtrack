import { BaseModel } from '@/models/base.model';

export interface LicensePlan extends BaseModel {
  id: string;
  code: string;
  name: string;
  cadence: string;
  description?: string | null;
  is_active: boolean;
}
