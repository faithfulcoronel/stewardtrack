import { BaseModel } from './base.model';

export interface MenuItem extends BaseModel {
  id: string;
  parent_id: string | null;
  code: string;
  label: string;
  path: string;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  section: string | null;
  permission_key: string;
  feature_key: string | null;
}
