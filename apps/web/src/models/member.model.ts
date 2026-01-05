import { BaseModel } from '@/models/base.model';
import { MemberHousehold } from '@/models/memberHousehold.model';
import type { FamilyMember, FamilyRole } from '@/models/familyMember.model';

export type PreferredContactMethod = 'email' | 'phone' | 'text' | 'mail';

/**
 * Family input data for creating/updating member's family association
 */
export interface FamilyInput {
  id?: string | null;
  name?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  member_names?: string[];
  role?: FamilyRole;
  isPrimary?: boolean;
}

export interface Member extends BaseModel {
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  preferred_name?: string | null;
  contact_number?: string | null;
  /** @deprecated Use address_street, address_city, address_state, address_postal_code instead */
  address?: string | null;
  // New split address fields
  address_street?: string | null;
  address_street2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  email?: string | null;
  membership_type_id: string;
  membership_status_id: string;
  membership_center_id?: string | null;
  membership_date: string | null;
  /** @deprecated Use family relationships via family_members table instead */
  household_id?: string | null;
  envelope_number?: string | null;
  birthday: string | null;
  anniversary?: string | null;
  profile_picture_url: string | null;
  gender: 'male' | 'female' | 'other';
  marital_status: 'single' | 'married' | 'widowed' | 'divorced' | 'engaged';
  occupation?: string | null;
  baptism_date?: string | null;
  spiritual_gifts?: string[] | null;
  ministry_interests?: string[] | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  physician_name?: string | null;
  leadership_position?: string | null;
  small_groups?: string[] | null;
  ministries?: string[] | null;
  volunteer_roles?: string[] | null;
  primary_small_group?: string | null;
  discipleship_pathways?: string[] | null;
  attendance_rate?: number | null;
  last_attendance_date?: string | null;
  pastoral_notes?: string | null;
  prayer_requests?: string[] | null;
  prayer_focus?: string | null;
  preferred_contact_method?: PreferredContactMethod | null;
  serving_team?: string | null;
  serving_role?: string | null;
  serving_schedule?: string | null;
  serving_coach?: string | null;
  next_serve_at?: string | null;
  discipleship_next_step?: string | null;
  discipleship_mentor?: string | null;
  discipleship_group?: string | null;
  team_focus?: string | null;
  reports_to?: string | null;
  leadership_roles?: string[] | null;
  last_huddle_at?: string | null;
  giving_recurring_amount?: number | null;
  giving_recurring_frequency?: string | null;
  giving_recurring_method?: string | null;
  giving_pledge_amount?: number | null;
  giving_pledge_campaign?: string | null;
  giving_primary_fund?: string | null;
  giving_last_gift_amount?: number | null;
  giving_last_gift_at?: string | null;
  giving_last_gift_fund?: string | null;
  giving_tier?: string | null;
  finance_notes?: string | null;
  tags?: string[] | null;
  data_steward?: string | null;
  last_review_at?: string | null;
  encrypted_fields?: string[] | null;
  encryption_key_version?: number | null;
  user_id?: string | null;
  linked_at?: string | null;
  membership_type?: {
    id: string;
    name: string;
    code: string;
  };
  membership_stage?: {
    id: string;
    name: string;
    code: string;
  };
  membership_center?: {
    id: string;
    name: string;
    code: string;
    is_primary?: boolean | null;
  } | null;
  /** @deprecated Use family instead */
  household?: MemberHousehold | null;

  // New family system fields
  /** Family input for creating/updating the member's family association */
  family?: FamilyInput | null;
  /** Primary family membership record (populated from family_members table) */
  primaryFamily?: FamilyMember | null;
  /** All family memberships (populated from family_members table) */
  families?: FamilyMember[] | null;
}
