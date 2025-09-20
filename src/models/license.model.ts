import { BaseModel } from './base.model';

export interface License extends BaseModel {
  id: string;
  tenant_id: string;
  plan_name: string;
  tier: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
}
