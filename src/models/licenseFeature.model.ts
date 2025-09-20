import { BaseModel } from './base.model';

export interface LicenseFeature extends BaseModel {
  id: string;
  tenant_id: string;
  license_id: string;
  feature: string;
  plan_name: string;
  feature_key: string;
}
