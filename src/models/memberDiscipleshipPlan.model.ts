import { BaseModel } from '@/models/base.model';

export interface MemberDiscipleshipPlan extends BaseModel {
  id: string;
  member_id: string;
  pathway?: string | null;
  next_step?: string | null;
  mentor_name?: string | null;
  small_group?: string | null;
  target_date?: string | null;
  status?: string | null;
  notes?: string | null;
}
