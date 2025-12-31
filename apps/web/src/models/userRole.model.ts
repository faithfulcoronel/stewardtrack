import { BaseModel } from '@/models/base.model';

export interface UserRole extends BaseModel {
  id: string;
  user_id: string;
  role_id: string;
}
