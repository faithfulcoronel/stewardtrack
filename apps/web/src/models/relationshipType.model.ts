import { BaseModel } from '@/models/base.model';

export interface RelationshipType extends BaseModel {
  id: string;
  type?: 'relationship_type';
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}
