import { BaseModel } from '@/models/base.model';

export type OccurrenceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface ScheduleOccurrence extends BaseModel {
  id: string;
  tenant_id: string;
  schedule_id: string;

  // Occurrence Details
  occurrence_date: string; // DATE format YYYY-MM-DD
  start_at: string; // TIMESTAMPTZ
  end_at?: string | null;

  // Override Information (nulls inherit from schedule)
  override_name?: string | null;
  override_description?: string | null;
  override_location?: string | null;
  override_capacity?: number | null;

  // Status
  status: OccurrenceStatus;
  cancellation_reason?: string | null;

  // Registration Stats (denormalized)
  registered_count: number;
  waitlist_count: number;
  checked_in_count: number;

  // QR Code
  qr_token?: string | null;
  qr_expires_at?: string | null;

  // Calendar Integration
  calendar_event_id?: string | null;
}

export interface ScheduleOccurrenceWithSchedule extends ScheduleOccurrence {
  schedule: {
    id: string;
    name: string;
    description?: string | null;
    schedule_type: string;
    location?: string | null;
    location_type: string;
    virtual_meeting_url?: string | null;
    capacity?: number | null;
    registration_required: boolean;
    registration_form_schema: unknown[];
    ministry: {
      id: string;
      name: string;
      code: string;
      color: string;
      icon: string;
    };
  };
}

export interface ScheduleOccurrenceCreateInput {
  schedule_id: string;
  occurrence_date: string;
  start_at: string;
  end_at?: string | null;
  override_name?: string | null;
  override_description?: string | null;
  override_location?: string | null;
  override_capacity?: number | null;
  status?: OccurrenceStatus;
}

export interface ScheduleOccurrenceUpdateInput {
  occurrence_date?: string;
  start_at?: string;
  end_at?: string | null;
  override_name?: string | null;
  override_description?: string | null;
  override_location?: string | null;
  override_capacity?: number | null;
  status?: OccurrenceStatus;
  cancellation_reason?: string | null;
  qr_token?: string | null;
  qr_expires_at?: string | null;
  calendar_event_id?: string | null;
}

export interface ScheduleOccurrenceFilters {
  scheduleId?: string;
  ministryId?: string;
  startDate?: string;
  endDate?: string;
  status?: OccurrenceStatus;
  statuses?: OccurrenceStatus[];
}

export interface ScheduleOccurrenceView {
  id: string;
  scheduleId: string;
  scheduleName: string;
  ministryId: string;
  ministryName: string;
  ministryColor: string;
  ministryIcon: string;
  title: string; // override_name or schedule.name
  description?: string | null;
  occurrenceDate: Date;
  startAt: Date;
  endAt?: Date | null;
  location?: string | null;
  locationType: string;
  virtualMeetingUrl?: string | null;
  capacity?: number | null;
  status: OccurrenceStatus;
  statusLabel: string;
  cancellationReason?: string | null;
  registeredCount: number;
  waitlistCount: number;
  checkedInCount: number;
  availableSpots?: number | null;
  registrationRequired: boolean;
  hasQrCode: boolean;
}

export interface OccurrenceGenerationResult {
  created: number;
  skipped: number;
  occurrences: ScheduleOccurrence[];
}
