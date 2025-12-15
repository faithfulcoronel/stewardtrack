import { BaseModel } from '@/models/base.model';

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
  badge_text: string | null;
  badge_variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | null;
  description: string | null;
  is_visible: boolean;
  metadata: Record<string, any>;
}
