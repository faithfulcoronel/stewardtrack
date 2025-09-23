import { BaseModel } from '@/models/base.model';

export interface MemberTag extends BaseModel {
  id: string;
  member_id: string;
  tag: string;
  color?: string | null;
}
