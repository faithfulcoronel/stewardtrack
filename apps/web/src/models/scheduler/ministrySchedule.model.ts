import { BaseModel } from '@/models/base.model';

export type ScheduleType =
  | 'service'
  | 'bible_study'
  | 'rehearsal'
  | 'conference'
  | 'seminar'
  | 'meeting'
  | 'other';

export type LocationType = 'physical' | 'virtual' | 'hybrid';

export interface RegistrationFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | boolean | number;
}

export interface MinistrySchedule extends BaseModel {
  id: string;
  tenant_id: string;
  ministry_id: string;

  // Schedule Information
  name: string;
  description?: string | null;
  schedule_type: ScheduleType;

  // Timing
  start_time: string; // TIME format HH:MM:SS
  end_time?: string | null;
  duration_minutes?: number | null;
  timezone: string;

  // Recurrence (iCal RRULE format)
  recurrence_rule?: string | null;
  recurrence_start_date: string; // DATE format YYYY-MM-DD
  recurrence_end_date?: string | null;

  // Location
  location?: string | null;
  location_type: LocationType;
  virtual_meeting_url?: string | null;

  // Capacity & Registration
  capacity?: number | null;
  waitlist_enabled: boolean;
  registration_required: boolean;
  registration_opens_days_before: number;
  registration_closes_hours_before: number;
  registration_form_schema: RegistrationFormField[];

  // Cover Photo (for registration pages)
  cover_photo_url?: string | null;

  // Online Payment (for paid registrations)
  accept_online_payment: boolean;
  registration_fee_amount?: number | null;
  registration_fee_currency: string;
  early_registration_fee_amount?: number | null;
  early_registration_deadline?: string | null; // DATE format YYYY-MM-DD

  // Status
  is_active: boolean;
}

export interface MinistryScheduleWithMinistry extends MinistrySchedule {
  ministry: {
    id: string;
    name: string;
    code: string;
    color: string;
    icon: string;
  };
}

export interface MinistryScheduleCreateInput {
  ministry_id: string;
  name: string;
  description?: string | null;
  schedule_type?: ScheduleType;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  timezone?: string;
  recurrence_rule?: string | null;
  recurrence_start_date: string;
  recurrence_end_date?: string | null;
  location?: string | null;
  location_type?: LocationType;
  virtual_meeting_url?: string | null;
  capacity?: number | null;
  waitlist_enabled?: boolean;
  registration_required?: boolean;
  registration_opens_days_before?: number;
  registration_closes_hours_before?: number;
  registration_form_schema?: RegistrationFormField[];
  accept_online_payment?: boolean;
  registration_fee_amount?: number | null;
  registration_fee_currency?: string;
  early_registration_fee_amount?: number | null;
  early_registration_deadline?: string | null;
  is_active?: boolean;
}

export interface MinistryScheduleUpdateInput {
  name?: string;
  description?: string | null;
  schedule_type?: ScheduleType;
  start_time?: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  timezone?: string;
  recurrence_rule?: string | null;
  recurrence_start_date?: string;
  recurrence_end_date?: string | null;
  location?: string | null;
  location_type?: LocationType;
  virtual_meeting_url?: string | null;
  capacity?: number | null;
  waitlist_enabled?: boolean;
  registration_required?: boolean;
  registration_opens_days_before?: number;
  registration_closes_hours_before?: number;
  registration_form_schema?: RegistrationFormField[];
  accept_online_payment?: boolean;
  registration_fee_amount?: number | null;
  registration_fee_currency?: string;
  early_registration_fee_amount?: number | null;
  early_registration_deadline?: string | null;
  is_active?: boolean;
}

export interface MinistryScheduleFilters {
  ministryId?: string;
  scheduleType?: ScheduleType;
  isActive?: boolean;
  startDateFrom?: string;
  startDateTo?: string;
}

export interface MinistryScheduleView {
  id: string;
  ministryId: string;
  ministryName: string;
  ministryColor: string;
  name: string;
  description?: string | null;
  scheduleType: ScheduleType;
  scheduleTypeLabel: string;
  startTime: string;
  endTime?: string | null;
  timezone: string;
  recurrenceRule?: string | null;
  recurrenceDescription?: string | null;
  location?: string | null;
  locationType: LocationType;
  virtualMeetingUrl?: string | null;
  capacity?: number | null;
  registrationRequired: boolean;
  isActive: boolean;
  upcomingOccurrenceCount: number;
}
