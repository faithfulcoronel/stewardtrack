import { BaseModel } from './base.model';

export interface MembershipType extends BaseModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}
