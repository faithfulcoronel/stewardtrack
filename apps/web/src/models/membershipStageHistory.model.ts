import { BaseModel } from '@/models/base.model';

export interface MembershipStageHistory extends BaseModel {
  id: string;
  member_id: string;
  previous_stage_id?: string | null;
  stage_id: string;
  changed_at: string;
  changed_by?: string | null;
  notes?: string | null;
}
