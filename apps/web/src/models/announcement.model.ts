import { BaseModel } from '@/models/base.model';

export interface Announcement extends BaseModel {
  id: string;
  tenant_id: string;
  message: string;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}
