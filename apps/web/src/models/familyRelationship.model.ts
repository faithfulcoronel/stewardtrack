import { BaseModel } from '@/models/base.model';

export interface FamilyRelationship extends BaseModel {
  member_id: string;
  related_member_id: string;
  relationship_category_id: string;
  notes?: string | null;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    contact_number?: string | null;
  };
  related_member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    contact_number?: string | null;
  };
  category?: {
    id: string;
    name: string;
    code: string;
  };
}
