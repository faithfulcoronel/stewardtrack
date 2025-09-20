import { BaseModel } from './base.model';

export interface ActivityLog extends BaseModel {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  performed_by: string;
  auth_users?: {
    id: string;
    email: string;
    raw_user_meta_data?: Record<string, unknown>;
  } | null;
}
