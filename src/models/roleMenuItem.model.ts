import { BaseModel } from './base.model';

export interface RoleMenuItem extends BaseModel {
  id: string;
  role_id: string;
  menu_item_id: string;
}
