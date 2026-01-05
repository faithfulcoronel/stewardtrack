import { BaseModel } from '@/models/base.model';
import { FamilyMember } from '@/models/familyMember.model';

export interface Family extends BaseModel {
  name: string;
  formal_name?: string | null;
  address_street?: string | null;
  address_street2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  family_photo_url?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  encrypted_fields?: string[] | null;
  encryption_key_version?: number | null;

  // Computed/joined fields
  members?: FamilyMember[];
  member_count?: number;
  head?: FamilyMember | null;
}
