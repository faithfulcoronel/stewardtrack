import { BaseModel } from '@/models/base.model';

export type PreferredContactMethod = 'email' | 'phone' | 'text' | 'mail';

export interface Member extends BaseModel {
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  preferred_name?: string | null;
  contact_number: string;
  address: string;
  email?: string | null;
  membership_type_id: string;
  membership_status_id: string;
  membership_center_id?: string | null;
  membership_date: string | null;
  envelope_number?: string | null;
  birthday: string | null;
  profile_picture_url: string | null;
  gender: 'male' | 'female' | 'other';
  marital_status: 'single' | 'married' | 'widowed' | 'divorced';
  baptism_date?: string | null;
  spiritual_gifts?: string[] | null;
  ministry_interests?: string[] | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  leadership_position?: string | null;
  small_groups?: string[] | null;
  ministries?: string[] | null;
  volunteer_roles?: string[] | null;
  attendance_rate?: number | null;
  last_attendance_date?: string | null;
  pastoral_notes?: string | null;
  prayer_requests?: string[] | null;
  preferred_contact_method?: PreferredContactMethod | null;
  care_status_code?: string | null;
  care_pastor?: string | null;
  care_follow_up_at?: string | null;
  serving_team?: string | null;
  serving_role?: string | null;
  serving_schedule?: string | null;
  serving_coach?: string | null;
  discipleship_next_step?: string | null;
  discipleship_mentor?: string | null;
  discipleship_group?: string | null;
  giving_recurring_amount?: number | null;
  giving_recurring_frequency?: string | null;
  giving_recurring_method?: string | null;
  giving_pledge_amount?: number | null;
  giving_pledge_campaign?: string | null;
  giving_last_gift_amount?: number | null;
  giving_last_gift_at?: string | null;
  giving_last_gift_fund?: string | null;
  tags?: string[] | null;
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
}
