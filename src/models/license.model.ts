import { BaseModel } from '@/models/base.model';

export interface License extends BaseModel {
  id: string;
  tenant_id: string;
  feature_id: string;
  grant_source: 'package' | 'direct' | 'trial' | 'comp';
  package_id: string | null;
  source_reference: string | null;
  starts_at: string | null;
  expires_at: string | null;
}
