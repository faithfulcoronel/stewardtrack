import { BaseModel } from '@/models/base.model';

export type AttendeeResponseStatus = 'pending' | 'accepted' | 'declined' | 'tentative';
export type AttendeeRole = 'organizer' | 'attendee' | 'optional';

export interface CalendarEventAttendee extends BaseModel {
  id: string;
  tenant_id: string;
  event_id: string;
  user_id?: string | null;
  member_id?: string | null;
  response_status: AttendeeResponseStatus;
  responded_at?: string | null;
  role: AttendeeRole;
}

export interface CalendarEventAttendeeCreateInput {
  event_id: string;
  user_id?: string | null;
  member_id?: string | null;
  response_status?: AttendeeResponseStatus;
  role?: AttendeeRole;
}
