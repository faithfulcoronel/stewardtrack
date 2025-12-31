import { BaseModel } from '@/models/base.model';

export interface MemberServingAssignment extends BaseModel {
  id: string;
  member_id: string;
  team_name: string;
  role_name?: string | null;
  schedule?: string | null;
  coach_name?: string | null;
  status?: string | null;
  start_on?: string | null;
  end_on?: string | null;
  is_primary: boolean;
  notes?: string | null;
}
