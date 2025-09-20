import { BaseModel } from './base.model';
import { Permission } from './permission.model';
import { MenuItem } from './menuItem.model';

export interface Role extends BaseModel {
  id: string;
  name: string;
  description: string | null;
  permissions?: { permission: Permission }[];
  menu_items?: { menu_item: MenuItem }[];
}
