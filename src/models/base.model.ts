import { Entity } from '../lib/repository/types';

export interface BaseModel extends Entity {
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
}