import { BaseModel } from './base.model';

export interface Notification extends BaseModel {
  id: string;
  user_id: string;
  tenant_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_type: 'redirect' | 'modal' | 'none';
  action_payload?: string;
  metadata?: Record<string, any>;
  expires_at?: string;
}