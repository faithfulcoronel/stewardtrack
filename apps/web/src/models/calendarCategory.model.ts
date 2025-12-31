import { BaseModel } from '@/models/base.model';

export interface CalendarCategory extends BaseModel {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
}

export interface CalendarCategoryCreateInput {
  name: string;
  code: string;
  description?: string | null;
  color?: string;
  icon?: string | null;
  sort_order?: number;
  is_system?: boolean;
  is_active?: boolean;
}

export interface CalendarCategoryUpdateInput {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
}
