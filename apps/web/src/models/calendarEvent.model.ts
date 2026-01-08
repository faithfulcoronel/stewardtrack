import { BaseModel } from '@/models/base.model';
import { CalendarCategory } from '@/models/calendarCategory.model';

export type CalendarEventType =
  | 'care_plan'
  | 'discipleship'
  | 'birthday'
  | 'anniversary'
  | 'meeting'
  | 'service'
  | 'event'
  | 'reminder'
  | 'goal'
  | 'general';

export type CalendarEventStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed';

export type CalendarEventPriority = 'low' | 'normal' | 'high' | 'urgent';

export type CalendarEventVisibility = 'private' | 'team' | 'public';

export type CalendarEventSourceType =
  | 'member_care_plans'
  | 'member_discipleship_plans'
  | 'member_birthday'
  | 'member_anniversary'
  | 'church_events'
  | 'meetings'
  | 'services'
  | 'goals'
  | 'objectives'
  | 'key_results'
  | null;

export interface CalendarEvent extends BaseModel {
  id: string;
  tenant_id: string;

  // Event details
  title: string;
  description?: string | null;
  location?: string | null;

  // Timing
  start_at: string;
  end_at?: string | null;
  all_day: boolean;
  timezone: string;

  // Category and type
  category_id?: string | null;
  category?: CalendarCategory | null;
  event_type: CalendarEventType;

  // Status
  status: CalendarEventStatus;
  priority: CalendarEventPriority;

  // Source linking
  source_type?: CalendarEventSourceType;
  source_id?: string | null;

  // Member assignment
  member_id?: string | null;
  assigned_to?: string | null;

  // Recurrence
  is_recurring: boolean;
  recurrence_rule?: string | null;
  recurrence_end_at?: string | null;
  parent_event_id?: string | null;

  // Visibility
  is_private: boolean;
  visibility: CalendarEventVisibility;

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;

  // Status
  is_active: boolean;
}

export interface CalendarEventCreateInput {
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
  timezone?: string;
  category_id?: string | null;
  event_type?: CalendarEventType;
  status?: CalendarEventStatus;
  priority?: CalendarEventPriority;
  source_type?: CalendarEventSourceType;
  source_id?: string | null;
  member_id?: string | null;
  assigned_to?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  recurrence_end_at?: string | null;
  is_private?: boolean;
  visibility?: CalendarEventVisibility;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CalendarEventUpdateInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  start_at?: string;
  end_at?: string | null;
  all_day?: boolean;
  timezone?: string;
  category_id?: string | null;
  event_type?: CalendarEventType;
  status?: CalendarEventStatus;
  priority?: CalendarEventPriority;
  member_id?: string | null;
  assigned_to?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  recurrence_end_at?: string | null;
  is_private?: boolean;
  visibility?: CalendarEventVisibility;
  tags?: string[];
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

// View model for calendar display
export interface CalendarEventView {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end?: Date | null;
  allDay: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor: string;
  categoryIcon?: string | null;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  sourceType?: CalendarEventSourceType;
  sourceId?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  isRecurring: boolean;
  isPrivate: boolean;
  tags: string[];
}

// Filter options for calendar queries
export interface CalendarEventFilters {
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  eventTypes?: CalendarEventType[];
  statuses?: CalendarEventStatus[];
  priorities?: CalendarEventPriority[];
  memberId?: string;
  assignedTo?: string;
  sourceType?: CalendarEventSourceType;
  includeCompleted?: boolean;
  includeCancelled?: boolean;
}
