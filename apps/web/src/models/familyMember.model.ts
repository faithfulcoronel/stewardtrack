import { BaseModel } from '@/models/base.model';
import { Family } from '@/models/family.model';

export type FamilyRole = 'head' | 'spouse' | 'child' | 'dependent' | 'other';

export interface FamilyMember extends BaseModel {
  family_id: string;
  member_id: string;
  is_primary: boolean;
  role: FamilyRole;
  role_notes?: string | null;
  is_active: boolean;
  joined_at?: string | null;
  left_at?: string | null;

  // Joined data from family
  family?: Family;

  // Joined data from member
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    contact_number?: string | null;
    profile_picture_url?: string | null;
  };
}
