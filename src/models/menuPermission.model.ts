import { BaseModel } from './base.model';

export interface MenuPermission extends BaseModel {
  id: string;
  menu_item_id: string;
  permission_id: string;
}
