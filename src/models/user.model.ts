import { BaseModel } from './base.model';

export interface User extends BaseModel {
  id: string;
  email: string;
  password?: string;
  raw_user_meta_data?: Record<string, any> | null;
  raw_app_meta_data?: Record<string, any> | null;
  last_sign_in_at?: string | null;
  phone?: string | null;
}
