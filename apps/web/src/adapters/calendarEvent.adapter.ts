import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  CalendarEvent,
  CalendarEventFilters,
  CalendarEventView,
} from '@/models/calendarEvent.model';
import type { AuditService } from '@/services/AuditService';
import type { TenantService } from '@/services/TenantService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { TYPES } from '@/lib/types';
import { TenantContextError } from '@/utils/errorHandler';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

export interface ICalendarEventAdapter extends IBaseAdapter<CalendarEvent> {
  getAll(): Promise<CalendarEvent[]>;
  getById(eventId: string): Promise<CalendarEvent | null>;
  getByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]>;
  getByFilters(filters: CalendarEventFilters): Promise<CalendarEvent[]>;
  getBySource(sourceType: string, sourceId: string): Promise<CalendarEvent[]>;
  existsBySource(sourceType: string, sourceId: string): Promise<boolean>;
  getByMember(memberId: string): Promise<CalendarEvent[]>;
  getUpcoming(days?: number): Promise<CalendarEvent[]>;
  getOverdueEvents(limit?: number): Promise<CalendarEventView[]>;
  getEventsForCalendarView(startDate: string, endDate: string): Promise<CalendarEventView[]>;
  // Single occurrence sync (used by SchedulerService for real-time sync)
  syncSingleOccurrence(occurrenceId: string): Promise<boolean>;
  deleteBySource(sourceType: string, sourceId: string): Promise<boolean>;
  // Reminder/Notification methods
  createEventReminders(eventId: string, eventStartAt: string, recipientIds?: string[], reminderMinutes?: number[]): Promise<number>;
  getPendingReminders(limit?: number): Promise<Array<{ id: string; event_id: string; remind_at: string; notification_type: string; recipient_id: string | null; event: CalendarEvent | null; }>>;
  markReminderSent(reminderId: string): Promise<boolean>;
  deleteEventReminders(eventId: string): Promise<boolean>;
}

@injectable()
export class CalendarEventAdapter
  extends BaseAdapter<CalendarEvent>
  implements ICalendarEventAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.TenantService) private tenantService: TenantService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super();
  }

  private async getTenantId(): Promise<string> {
    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      throw new TenantContextError('No tenant context available');
    }
    return tenant.id;
  }

  /**
   * Decrypt member first_name and last_name fields
   * Returns the decrypted name or the original value if decryption fails
   */
  private async decryptMemberName(
    tenantId: string,
    firstName: string | null,
    lastName: string | null
  ): Promise<{ firstName: string; lastName: string }> {
    let decryptedFirstName = firstName || '';
    let decryptedLastName = lastName || '';

    try {
      // Check if the value looks encrypted (format: version.iv.authTag.ciphertext)
      const isEncrypted = (value: string) => {
        if (!value) return false;
        const parts = value.split('.');
        return parts.length === 4 && !isNaN(parseInt(parts[0]));
      };

      if (firstName && isEncrypted(firstName)) {
        const decrypted = await this.encryptionService.decrypt(firstName, tenantId, 'first_name');
        decryptedFirstName = decrypted || firstName;
      }

      if (lastName && isEncrypted(lastName)) {
        const decrypted = await this.encryptionService.decrypt(lastName, tenantId, 'last_name');
        decryptedLastName = decrypted || lastName;
      }
    } catch (error) {
      console.error('[CalendarEventAdapter] Failed to decrypt member name:', error);
      // Return original values on error
    }

    return { firstName: decryptedFirstName, lastName: decryptedLastName };
  }

  protected tableName = 'calendar_events';

  protected defaultSelect = `
    id,
    tenant_id,
    title,
    description,
    location,
    start_at,
    end_at,
    all_day,
    timezone,
    category_id,
    event_type,
    status,
    priority,
    source_type,
    source_id,
    member_id,
    assigned_to,
    is_recurring,
    recurrence_rule,
    recurrence_end_at,
    parent_event_id,
    is_private,
    visibility,
    tags,
    metadata,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  protected selectWithCategory = `
    ${this.defaultSelect},
    category:calendar_categories(
      id,
      name,
      code,
      color,
      icon
    )
  `;

  protected override async onBeforeCreate(
    data: Partial<CalendarEvent>
  ): Promise<Partial<CalendarEvent>> {
    if (data.is_active === undefined) data.is_active = true;
    if (data.all_day === undefined) data.all_day = false;
    if (data.is_recurring === undefined) data.is_recurring = false;
    if (data.is_private === undefined) data.is_private = false;
    if (!data.timezone) data.timezone = 'UTC';
    if (!data.event_type) data.event_type = 'general';
    if (!data.status) data.status = 'scheduled';
    if (!data.priority) data.priority = 'normal';
    if (!data.visibility) data.visibility = 'team';
    if (!data.tags) data.tags = [];
    if (!data.metadata) data.metadata = {};
    return data;
  }

  protected override async onAfterCreate(data: CalendarEvent): Promise<void> {
    await this.auditService.logAuditEvent('create', 'calendar_events', data.id, data);
  }

  protected override async onAfterUpdate(data: CalendarEvent): Promise<void> {
    await this.auditService.logAuditEvent('update', 'calendar_events', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'calendar_events', id, { id });
  }

  async getAll(): Promise<CalendarEvent[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithCategory)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find calendar events: ${error.message}`);
    }

    return (data as unknown as CalendarEvent[]) || [];
  }

  async getById(eventId: string): Promise<CalendarEvent | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithCategory)
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find calendar event by ID: ${error.message}`);
    }

    return data as CalendarEvent | null;
  }

  async getByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithCategory)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .gte('start_at', startDate)
      .lte('start_at', endDate)
      .order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find calendar events by date range: ${error.message}`);
    }

    return (data as unknown as CalendarEvent[]) || [];
  }

  async getByFilters(filters: CalendarEventFilters): Promise<CalendarEvent[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.selectWithCategory)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    // Date range filters
    if (filters.startDate) {
      query = query.gte('start_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('start_at', filters.endDate);
    }

    // Category filters
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      query = query.in('category_id', filters.categoryIds);
    }

    // Event type filters
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      query = query.in('event_type', filters.eventTypes);
    }

    // Status filters
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    } else {
      // Default: exclude cancelled unless specified
      if (!filters.includeCancelled) {
        query = query.neq('status', 'cancelled');
      }
      // Default: exclude completed unless specified
      if (!filters.includeCompleted) {
        query = query.neq('status', 'completed');
      }
    }

    // Priority filters
    if (filters.priorities && filters.priorities.length > 0) {
      query = query.in('priority', filters.priorities);
    }

    // Member filter
    if (filters.memberId) {
      query = query.eq('member_id', filters.memberId);
    }

    // Assigned to filter
    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    // Source type filter
    if (filters.sourceType) {
      query = query.eq('source_type', filters.sourceType);
    }

    // Active filter
    query = query.eq('is_active', true);

    const { data, error } = await query.order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find calendar events by filters: ${error.message}`);
    }

    return (data as unknown as CalendarEvent[]) || [];
  }

  async getBySource(sourceType: string, sourceId: string): Promise<CalendarEvent[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithCategory)
      .eq('tenant_id', tenantId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find calendar events by source: ${error.message}`);
    }

    return (data as unknown as CalendarEvent[]) || [];
  }

  /**
   * Check if an event already exists for a specific source
   * Returns true if an event exists (including soft-deleted ones to prevent re-sync)
   */
  async existsBySource(sourceType: string, sourceId: string): Promise<boolean> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId);

    if (error) {
      throw new Error(`Failed to check existing calendar event: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  async getByMember(memberId: string): Promise<CalendarEvent[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithCategory)
      .eq('tenant_id', tenantId)
      .eq('member_id', memberId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find calendar events by member: ${error.message}`);
    }

    return (data as unknown as CalendarEvent[]) || [];
  }

  async getUpcoming(days: number = 7): Promise<CalendarEvent[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithCategory)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .neq('status', 'completed')
      .gte('start_at', now.toISOString())
      .lte('start_at', futureDate.toISOString())
      .order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find upcoming calendar events: ${error.message}`);
    }

    return (data as unknown as CalendarEvent[]) || [];
  }

  async getOverdueEvents(limit: number = 10): Promise<CalendarEventView[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const now = new Date();

    // Get overdue events (past events that are not completed/cancelled)
    // Use !member_id hint to specify which FK to use since calendar_events has both member_id and assigned_to referencing members
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        ${this.defaultSelect},
        category:calendar_categories(id, name, code, color, icon),
        member:members!member_id(id, first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .neq('status', 'completed')
      .lt('start_at', now.toISOString())
      .order('start_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to find overdue calendar events: ${error.message}`);
    }

    if (!data) return [];

    // Transform to CalendarEventView with decrypted member names
    const events: CalendarEventView[] = [];
    for (const event of data as unknown as Array<CalendarEvent & { member?: { id: string; first_name: string | null; last_name: string | null } }>) {
      let memberName: string | null = null;

      if (event.member) {
        const { firstName, lastName } = await this.decryptMemberName(
          tenantId,
          event.member.first_name,
          event.member.last_name
        );
        memberName = `${firstName} ${lastName}`.trim() || null;
      }

      events.push({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        start: new Date(event.start_at),
        end: event.end_at ? new Date(event.end_at) : null,
        allDay: event.all_day,
        categoryId: event.category_id,
        categoryName: event.category?.name || null,
        categoryColor: event.category?.color || '#EF4444',
        categoryIcon: event.category?.icon || null,
        eventType: event.event_type,
        status: 'overdue',
        priority: event.priority,
        sourceType: event.source_type,
        sourceId: event.source_id,
        memberId: event.member_id,
        memberName,
        assignedToId: event.assigned_to,
        assignedToName: null,
        isRecurring: event.is_recurring,
        isPrivate: event.is_private,
        tags: event.tags,
      });
    }

    return events;
  }

  async getEventsForCalendarView(
    startDate: string,
    endDate: string
  ): Promise<CalendarEventView[]> {
    const events = await this.getByDateRange(startDate, endDate);

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start: new Date(event.start_at),
      end: event.end_at ? new Date(event.end_at) : null,
      allDay: event.all_day,
      categoryId: event.category_id,
      categoryName: event.category?.name || null,
      categoryColor: event.category?.color || '#3B82F6',
      categoryIcon: event.category?.icon || null,
      eventType: event.event_type,
      status: event.status,
      priority: event.priority,
      sourceType: event.source_type,
      sourceId: event.source_id,
      memberId: event.member_id,
      memberName: null, // Will be populated by service if needed
      assignedToId: event.assigned_to,
      assignedToName: null, // Will be populated by service if needed
      isRecurring: event.is_recurring,
      isPrivate: event.is_private,
      tags: event.tags,
    }));
  }

  // Note: Bulk sync methods (syncFromCarePlans, syncFromDiscipleshipPlans, syncFromMemberBirthdays,
  // syncFromMemberAnniversaries, syncFromScheduleOccurrences) have been removed.
  // All calendar events are now synced in real-time by their respective services when
  // source entities are created, updated, or deleted.
  // See: CarePlanService, DiscipleshipPlanService, MemberService, SchedulerService,
  //      GoalService, and ObjectiveService for auto-sync implementations.

  // (Removed syncFromMemberBirthdays - now synced in real-time by MemberService)
  // (Removed syncFromMemberAnniversaries - now synced in real-time by MemberService)
  // (Removed syncFromScheduleOccurrences - now synced in real-time by SchedulerService)

  /**
   * Sync a single schedule occurrence to calendar
   * Used when an occurrence is created or updated
   */
  async syncSingleOccurrence(occurrenceId: string): Promise<boolean> {
    const tenantId = await this.getTenantId();
    const serviceClient = await getSupabaseServiceClient();

    // Fetch the specific occurrence with schedule and ministry info
    const { data: occurrence, error: occurrenceError } = await serviceClient
      .from('schedule_occurrences')
      .select(`
        id,
        schedule_id,
        start_at,
        end_at,
        status,
        override_name,
        override_location,
        override_capacity,
        registered_count,
        checked_in_count,
        ministry_schedules (
          id,
          name,
          description,
          location,
          ministry_id,
          schedule_type,
          registration_required,
          ministries (
            id,
            name
          )
        )
      `)
      .eq('id', occurrenceId)
      .eq('tenant_id', tenantId)
      .single();

    if (occurrenceError || !occurrence) {
      console.error('[syncSingleOccurrence] Failed to fetch occurrence:', occurrenceError?.message);
      return false;
    }

    const typedOccurrence = occurrence as unknown as {
      id: string;
      schedule_id: string;
      start_at: string;
      end_at: string | null;
      status: string;
      override_name: string | null;
      override_location: string | null;
      override_capacity: number | null;
      registered_count: number;
      checked_in_count: number;
      ministry_schedules: {
        id: string;
        name: string;
        description: string | null;
        location: string | null;
        ministry_id: string;
        schedule_type: string;
        registration_required: boolean;
        ministries: { id: string; name: string } | null;
      } | null;
    };

    const schedule = typedOccurrence.ministry_schedules;
    if (!schedule) return false;

    // Get existing event
    const { data: existingEvents } = await serviceClient
      .from(this.tableName)
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('source_type', 'schedule_occurrence')
      .eq('source_id', occurrenceId)
      .is('deleted_at', null)
      .limit(1);

    const existingEvent = existingEvents?.[0];

    // Get the event category
    const { data: category } = await serviceClient
      .from('calendar_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', 'event')
      .maybeSingle();

    // Build event data
    const ministryName = schedule.ministries?.name || 'Ministry';
    const eventTitle = typedOccurrence.override_name || schedule.name;
    const eventDescription = schedule.description || '';
    const eventLocation = typedOccurrence.override_location || schedule.location || '';

    // Map occurrence status to calendar event status
    let eventStatus: 'scheduled' | 'cancelled' | 'completed' = 'scheduled';
    if (typedOccurrence.status === 'cancelled') {
      eventStatus = 'cancelled';
    } else if (typedOccurrence.status === 'completed') {
      eventStatus = 'completed';
    }

    const metadata = {
      schedule_id: typedOccurrence.schedule_id,
      ministry_id: schedule.ministry_id,
      ministry_name: ministryName,
      schedule_type: schedule.schedule_type,
      capacity: typedOccurrence.override_capacity,
      registered_count: typedOccurrence.registered_count,
      checked_in_count: typedOccurrence.checked_in_count,
      registration_required: schedule.registration_required,
    };

    if (existingEvent) {
      // Update existing event
      const { error: updateError } = await serviceClient
        .from(this.tableName)
        .update({
          title: eventTitle,
          description: eventDescription,
          location: eventLocation,
          start_at: typedOccurrence.start_at,
          end_at: typedOccurrence.end_at,
          status: eventStatus,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEvent.id);

      return !updateError;
    } else {
      // Create new calendar event
      const { error: insertError } = await serviceClient.from(this.tableName).insert({
        tenant_id: tenantId,
        title: eventTitle,
        description: eventDescription,
        location: eventLocation,
        start_at: typedOccurrence.start_at,
        end_at: typedOccurrence.end_at,
        all_day: false,
        timezone: 'UTC',
        category_id: category?.id || null,
        event_type: 'schedule',
        status: eventStatus,
        priority: 'normal',
        source_type: 'schedule_occurrence',
        source_id: occurrenceId,
        member_id: null,
        assigned_to: null,
        is_recurring: false,
        is_private: false,
        visibility: 'public',
        tags: ['scheduler', schedule.schedule_type, ministryName.toLowerCase().replace(/\s+/g, '-')],
        metadata,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return !insertError;
    }
  }

  /**
   * Delete calendar event by source type and ID
   * Used when an occurrence is cancelled/deleted
   */
  async deleteBySource(sourceType: string, sourceId: string): Promise<boolean> {
    const tenantId = await this.getTenantId();
    const serviceClient = await getSupabaseServiceClient();

    // Soft delete the calendar event
    const { error } = await serviceClient
      .from(this.tableName)
      .update({
        is_active: false,
        status: 'cancelled',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId);

    if (error) {
      console.error('[deleteBySource] Failed to delete calendar event:', error.message);
      return false;
    }

    return true;
  }

  /**
   * Create reminders for a calendar event
   * Typically creates reminders at 24h, 1h, and 15min before the event
   */
  async createEventReminders(
    eventId: string,
    eventStartAt: string,
    recipientIds?: string[],
    reminderMinutes: number[] = [1440, 60, 15] // 24h, 1h, 15min
  ): Promise<number> {
    const tenantId = await this.getTenantId();
    const serviceClient = await getSupabaseServiceClient();
    let createdCount = 0;

    const eventStart = new Date(eventStartAt);

    for (const minutesBefore of reminderMinutes) {
      const remindAt = new Date(eventStart.getTime() - minutesBefore * 60 * 1000);

      // Skip if reminder time is in the past
      if (remindAt < new Date()) {
        continue;
      }

      // Determine notification type based on time before event
      const notificationType = minutesBefore >= 1440 ? 'email' : 'in_app';

      // If recipient IDs provided, create reminder for each
      if (recipientIds && recipientIds.length > 0) {
        for (const recipientId of recipientIds) {
          // Check if reminder already exists
          const { data: existing } = await serviceClient
            .from('calendar_event_reminders')
            .select('id')
            .eq('event_id', eventId)
            .eq('recipient_id', recipientId)
            .eq('minutes_before', minutesBefore)
            .maybeSingle();

          if (!existing) {
            const { error } = await serviceClient.from('calendar_event_reminders').insert({
              tenant_id: tenantId,
              event_id: eventId,
              remind_at: remindAt.toISOString(),
              minutes_before: minutesBefore,
              notification_type: notificationType,
              recipient_id: recipientId,
              is_sent: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            if (!error) {
              createdCount++;
            }
          }
        }
      } else {
        // Create a general reminder (no specific recipient)
        const { data: existing } = await serviceClient
          .from('calendar_event_reminders')
          .select('id')
          .eq('event_id', eventId)
          .eq('minutes_before', minutesBefore)
          .is('recipient_id', null)
          .maybeSingle();

        if (!existing) {
          const { error } = await serviceClient.from('calendar_event_reminders').insert({
            tenant_id: tenantId,
            event_id: eventId,
            remind_at: remindAt.toISOString(),
            minutes_before: minutesBefore,
            notification_type: notificationType,
            recipient_id: null,
            is_sent: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (!error) {
            createdCount++;
          }
        }
      }
    }

    return createdCount;
  }

  /**
   * Get pending reminders that need to be sent
   * Used by a scheduled job to send notifications
   */
  async getPendingReminders(limit: number = 100): Promise<Array<{
    id: string;
    event_id: string;
    remind_at: string;
    notification_type: string;
    recipient_id: string | null;
    event: CalendarEvent | null;
  }>> {
    const tenantId = await this.getTenantId();
    const serviceClient = await getSupabaseServiceClient();

    const now = new Date().toISOString();

    const { data, error } = await serviceClient
      .from('calendar_event_reminders')
      .select(`
        id,
        event_id,
        remind_at,
        notification_type,
        recipient_id,
        calendar_events (*)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_sent', false)
      .lte('remind_at', now)
      .order('remind_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[getPendingReminders] Failed:', error.message);
      return [];
    }

    return (data || []).map((r: unknown) => {
      const reminder = r as {
        id: string;
        event_id: string;
        remind_at: string;
        notification_type: string;
        recipient_id: string | null;
        calendar_events: CalendarEvent | null;
      };
      return {
        id: reminder.id,
        event_id: reminder.event_id,
        remind_at: reminder.remind_at,
        notification_type: reminder.notification_type,
        recipient_id: reminder.recipient_id,
        event: reminder.calendar_events,
      };
    });
  }

  /**
   * Mark a reminder as sent
   */
  async markReminderSent(reminderId: string): Promise<boolean> {
    const tenantId = await this.getTenantId();
    const serviceClient = await getSupabaseServiceClient();

    const { error } = await serviceClient
      .from('calendar_event_reminders')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .eq('tenant_id', tenantId);

    return !error;
  }

  /**
   * Delete reminders for an event
   * Used when an event is cancelled/deleted
   */
  async deleteEventReminders(eventId: string): Promise<boolean> {
    const tenantId = await this.getTenantId();
    const serviceClient = await getSupabaseServiceClient();

    const { error } = await serviceClient
      .from('calendar_event_reminders')
      .delete()
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId);

    return !error;
  }
}
