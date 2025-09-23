import { BaseModel } from '@/models/base.model';

export interface MembershipCenter extends BaseModel {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  address?: Record<string, unknown> | null;
  service_times?: string[] | null;
  is_system: boolean;
  is_active: boolean;
  is_primary: boolean;
  sort_order: number;
}
