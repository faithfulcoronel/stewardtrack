import { BaseModel } from '@/models/base.model';

export interface MemberTimelineEvent extends BaseModel {
  id: string;
  member_id: string;
  title: string;
  description?: string | null;
  event_type?: string | null;
  event_category?: string | null;
  status?: string | null;
  icon?: string | null;
  occurred_at?: string | null;
  recorded_at?: string | null;
  metadata?: Record<string, unknown> | null;
}
