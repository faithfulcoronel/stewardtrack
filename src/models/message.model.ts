import { BaseModel } from './base.model';

export interface Message extends BaseModel {
  id: string;
  thread_id: string;
  tenant_id: string;
  sender_id: string;
  body: string;
  attachments?: any[];
}
