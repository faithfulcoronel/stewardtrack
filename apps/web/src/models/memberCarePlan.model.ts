import { BaseModel } from '@/models/base.model';

export interface MemberCarePlan extends BaseModel {
  id: string;
  member_id: string;
  status_code: string;
  status_label?: string | null;
  /** @deprecated Use assigned_to_member_id instead */
  assigned_to?: string | null;
  /** UUID reference to the member assigned to this care plan */
  assigned_to_member_id?: string | null;
  follow_up_at?: string | null;
  closed_at?: string | null;
  priority?: string | null;
  details?: string | null;
  membership_stage_id?: string | null;
  is_active: boolean;
}
