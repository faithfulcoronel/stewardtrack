import { BaseModel } from './base.model';
import type { Message } from './message.model';

export type MessageThreadStatus = 'pending' | 'resolved' | 'in_progress';

export interface MessageThread extends BaseModel {
  id: string;
  tenant_id: string;
  subject: string;
  status: MessageThreadStatus;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
  messages?: Message[];
}
