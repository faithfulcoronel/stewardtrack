import { BaseModel } from '@/models/base.model';
import { Permission } from '@/models/permission.model';
import { MenuItem } from '@/models/menuItem.model';

export interface Role extends BaseModel {
  id: string;
  name: string;
  description: string | null;
  permissions?: { permission: Permission }[];
  menu_items?: { menu_item: MenuItem }[];
}
