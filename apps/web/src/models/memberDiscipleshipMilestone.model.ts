import { BaseModel } from '@/models/base.model';

export interface MemberDiscipleshipMilestone extends BaseModel {
  id: string;
  member_id: string;
  plan_id?: string | null;
  name: string;
  description?: string | null;
  milestone_date?: string | null;
  celebrated_at?: string | null;
  notes?: string | null;
}
