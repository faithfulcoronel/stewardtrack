import { BaseModel } from '@/models/base.model';

export interface LicenseFeature extends BaseModel {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  phase: string;
  is_delegatable: boolean;
  is_active: boolean;
}
