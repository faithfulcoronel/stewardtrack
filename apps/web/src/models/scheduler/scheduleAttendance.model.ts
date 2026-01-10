import { BaseModel } from '@/models/base.model';

export type CheckinMethod = 'staff_scan' | 'self_checkin' | 'manual';

export interface ScheduleAttendance extends BaseModel {
  id: string;
  tenant_id: string;
  occurrence_id: string;

  // Attendee
  member_id?: string | null;
  registration_id?: string | null;
  guest_name?: string | null;

  // Check-in Details
  checked_in_at: string;
  checked_in_by?: string | null;

  // Check-in Method
  checkin_method: CheckinMethod;
  qr_token_used?: string | null;

  // Device Info
  device_info: Record<string, unknown>;

  // Checkout
  checked_out_at?: string | null;
}

export interface ScheduleAttendanceWithMember extends ScheduleAttendance {
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
  checked_in_by_user?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
    };
  } | null;
}

export interface ScheduleAttendanceCreateInput {
  occurrence_id: string;
  member_id?: string | null;
  registration_id?: string | null;
  guest_name?: string | null;
  checkin_method: CheckinMethod;
  qr_token_used?: string | null;
  device_info?: Record<string, unknown>;
}

export interface ScheduleAttendanceFilters {
  occurrenceId?: string;
  memberId?: string;
  checkinMethod?: CheckinMethod;
  checkedInAfter?: string;
  checkedInBefore?: string;
}

export interface ScheduleAttendanceView {
  id: string;
  occurrenceId: string;
  memberId?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  memberAvatarUrl?: string | null;
  guestName?: string | null;
  displayName: string; // member name or guest name
  isGuest: boolean;
  registrationId?: string | null;
  checkedInAt: Date;
  checkedInByName?: string | null;
  checkinMethod: CheckinMethod;
  checkinMethodLabel: string;
  checkedOutAt?: Date | null;
  duration?: number | null; // in minutes
}

export interface AttendanceStats {
  totalCheckedIn: number;
  totalRegistered: number;
  totalCapacity?: number | null;
  attendanceRate: number; // percentage
  byMethod: {
    staff_scan: number;
    self_checkin: number;
    manual: number;
  };
  recentCheckins: ScheduleAttendanceView[];
}

export interface MemberAttendanceHistory {
  memberId: string;
  memberName: string;
  totalAttendance: number;
  attendanceRecords: {
    occurrenceId: string;
    scheduleName: string;
    ministryName: string;
    occurrenceDate: Date;
    checkedInAt: Date;
    checkinMethod: CheckinMethod;
  }[];
}
