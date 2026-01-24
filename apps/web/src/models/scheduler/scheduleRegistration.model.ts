import { BaseModel } from '@/models/base.model';

export type RegistrationStatus =
  | 'registered'
  | 'waitlisted'
  | 'cancelled'
  | 'checked_in'
  | 'no_show';

export interface ScheduleRegistration extends BaseModel {
  id: string;
  tenant_id: string;
  occurrence_id: string;

  // Registrant
  member_id?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;

  // Registration Details
  registration_date: string;
  party_size: number;
  confirmation_code?: string | null;

  // Status
  status: RegistrationStatus;
  waitlist_position?: number | null;

  // Custom Form Responses
  form_responses: Record<string, unknown>;

  // Notes
  special_requests?: string | null;
  admin_notes?: string | null;
}

export interface ScheduleRegistrationWithMember extends ScheduleRegistration {
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface ScheduleRegistrationCreateInput {
  occurrence_id: string;
  member_id?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  party_size?: number;
  form_responses?: Record<string, unknown>;
  special_requests?: string | null;
}

export interface ScheduleRegistrationUpdateInput {
  party_size?: number;
  status?: RegistrationStatus;
  waitlist_position?: number | null;
  form_responses?: Record<string, unknown>;
  special_requests?: string | null;
  admin_notes?: string | null;
}

export interface ScheduleRegistrationFilters {
  occurrenceId?: string;
  memberId?: string;
  status?: RegistrationStatus;
  statuses?: RegistrationStatus[];
  guestEmail?: string;
}

export interface ScheduleRegistrationView {
  id: string;
  occurrenceId: string;
  memberId?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  memberPhone?: string | null;
  memberAvatarUrl?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  displayName: string; // member name or guest name
  displayEmail?: string | null;
  displayPhone?: string | null;
  isGuest: boolean;
  registrationDate: Date;
  partySize: number;
  confirmationCode?: string | null;
  status: RegistrationStatus;
  statusLabel: string;
  waitlistPosition?: number | null;
  formResponses: Record<string, unknown>;
  specialRequests?: string | null;
  adminNotes?: string | null;
}

export interface GuestRegistrationInput {
  occurrence_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  party_size?: number;
  form_responses?: Record<string, unknown>;
  special_requests?: string | null;
}
