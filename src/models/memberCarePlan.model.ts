import { BaseModel } from '@/models/base.model';

export interface MemberCarePlan extends BaseModel {
  id: string;
  member_id: string;
  status_code: string;
  status_label?: string | null;
  assigned_to?: string | null;
  follow_up_at?: string | null;
  closed_at?: string | null;
  priority?: string | null;
  details?: string | null;
  membership_stage_id?: string | null;
  is_active: boolean;
}
