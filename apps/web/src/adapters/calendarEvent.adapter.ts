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
  syncFromCarePlans(): Promise<number>;
  syncFromDiscipleshipPlans(): Promise<number>;
  syncFromMemberBirthdays(): Promise<number>;
  syncFromMemberAnniversaries(): Promise<number>;
  syncFromScheduleOccurrences(): Promise<number>;
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

  async syncFromCarePlans(): Promise<number> {
    const tenantId = await this.getTenantId();
    // Use service client to bypass RLS for reading care plans
    // This is a system-level sync operation that needs access regardless of user permissions
    const serviceClient = await getSupabaseServiceClient();
    let syncedCount = 0;

    // Fetch care plans with follow-up dates using service client (bypasses RLS)
    // Include both legacy assigned_to and new assigned_to_member_id columns
    const { data: carePlans, error: carePlansError } = await serviceClient
      .from('member_care_plans')
      .select('id, member_id, status_label, status_code, follow_up_at, priority, details, assigned_to, assigned_to_member_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .not('follow_up_at', 'is', null);

    console.log('[syncFromCarePlans] Found care plans:', carePlans?.length ?? 0, carePlansError ? `Error: ${carePlansError.message}` : '');

    if (carePlansError) {
      throw new Error(`Failed to fetch care plans for sync: ${carePlansError.message}`);
    }

    if (!carePlans) return 0;

    // Get the care_plan category using service client
    const { data: category } = await serviceClient
      .from('calendar_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', 'care_plan')
      .maybeSingle();

    console.log('[syncFromCarePlans] Care plan category:', category?.id ?? 'NOT FOUND');

    for (const plan of carePlans) {
      // Get existing event for this source (if any) using service client
      const { data: existingEvents } = await serviceClient
        .from(this.tableName)
        .select('id, start_at, title, description, priority')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'member_care_plans')
        .eq('source_id', plan.id)
        .is('deleted_at', null)
        .limit(1);

      const existingEvent = existingEvents?.[0];
      const newTitle = `Care Plan: ${plan.status_label || plan.status_code || 'Follow-up'}`;
      const newPriority = plan.priority || 'normal';

      // Use the new assigned_to_member_id column (UUID) if available
      // Fall back to legacy assigned_to text field and store in metadata
      const assignedToUuid = plan.assigned_to_member_id || null;
      const assignedToName = !plan.assigned_to_member_id && plan.assigned_to ? plan.assigned_to : null;

      console.log('[syncFromCarePlans] Processing plan:', plan.id, 'existingEvent:', existingEvent?.id ?? 'NONE');

      if (existingEvent) {
        // Check if any data has changed (date, title, description, or priority)
        const dateChanged = existingEvent.start_at !== plan.follow_up_at;
        const titleChanged = existingEvent.title !== newTitle;
        const descriptionChanged = existingEvent.description !== plan.details;
        const priorityChanged = existingEvent.priority !== newPriority;

        if (dateChanged || titleChanged || descriptionChanged || priorityChanged) {
          // Update existing event with new data using service client
          const { error: updateError } = await serviceClient
            .from(this.tableName)
            .update({
              title: newTitle,
              description: plan.details,
              start_at: plan.follow_up_at,
              priority: newPriority,
              assigned_to: assignedToUuid,
              metadata: assignedToName ? { assigned_to_name: assignedToName } : {},
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingEvent.id);

          console.log('[syncFromCarePlans] Update result:', updateError ? `ERROR: ${updateError.message}` : 'SUCCESS');
          if (!updateError) {
            syncedCount++;
          }
        }
      } else {
        // Create new event using service client
        const { error: insertError } = await serviceClient.from(this.tableName).insert({
          tenant_id: tenantId,
          title: newTitle,
          description: plan.details,
          start_at: plan.follow_up_at,
          all_day: false,
          timezone: 'UTC',
          category_id: category?.id || null,
          event_type: 'care_plan',
          status: 'scheduled',
          priority: newPriority,
          source_type: 'member_care_plans',
          source_id: plan.id,
          member_id: plan.member_id,
          assigned_to: assignedToUuid,
          is_recurring: false,
          is_private: false,
          visibility: 'team',
          tags: ['care-plan', 'follow-up'],
          metadata: assignedToName ? { assigned_to_name: assignedToName } : {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        console.log('[syncFromCarePlans] Insert result:', insertError ? `ERROR: ${insertError.message}` : 'SUCCESS');
        if (!insertError) {
          syncedCount++;
        }
      }
    }

    return syncedCount;
  }

  async syncFromDiscipleshipPlans(): Promise<number> {
    const tenantId = await this.getTenantId();
    // Use service client to bypass RLS for reading discipleship plans
    // This is a system-level sync operation that needs access regardless of user permissions
    const serviceClient = await getSupabaseServiceClient();
    let syncedCount = 0;

    // Fetch discipleship plans with target dates using service client (bypasses RLS)
    const { data: discipleshipPlans, error: plansError } = await serviceClient
      .from('member_discipleship_plans')
      .select('id, member_id, pathway, status, target_date, mentor_name, notes')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('target_date', 'is', null);

    console.log('[syncFromDiscipleshipPlans] Found discipleship plans:', discipleshipPlans?.length ?? 0, plansError ? `Error: ${plansError.message}` : '');

    if (plansError) {
      throw new Error(`Failed to fetch discipleship plans for sync: ${plansError.message}`);
    }

    if (!discipleshipPlans) return 0;

    // Get the discipleship category using service client
    const { data: category } = await serviceClient
      .from('calendar_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', 'discipleship')
      .maybeSingle();

    console.log('[syncFromDiscipleshipPlans] Discipleship category:', category?.id ?? 'NOT FOUND');

    for (const plan of discipleshipPlans) {
      // Get existing event for this source (if any) using service client
      const { data: existingEvents } = await serviceClient
        .from(this.tableName)
        .select('id, start_at, title, description')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'member_discipleship_plans')
        .eq('source_id', plan.id)
        .is('deleted_at', null)
        .limit(1);

      const existingEvent = existingEvents?.[0];
      const newTitle = `Discipleship: ${plan.pathway || plan.status || 'Milestone'}`;

      console.log('[syncFromDiscipleshipPlans] Processing plan:', plan.id, 'existingEvent:', existingEvent?.id ?? 'NONE');

      if (existingEvent) {
        // Check if any data has changed (date, title, or description)
        const dateChanged = existingEvent.start_at !== plan.target_date;
        const titleChanged = existingEvent.title !== newTitle;
        const descriptionChanged = existingEvent.description !== plan.notes;

        if (dateChanged || titleChanged || descriptionChanged) {
          // Update existing event with new data using service client
          // Also ensure source_id and member_id are correct (fixes legacy data issues)
          const { error: updateError } = await serviceClient
            .from(this.tableName)
            .update({
              title: newTitle,
              description: plan.notes,
              start_at: plan.target_date,
              source_id: plan.id,
              member_id: plan.member_id,
              metadata: { mentor_name: plan.mentor_name },
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingEvent.id);

          console.log('[syncFromDiscipleshipPlans] Update result:', updateError ? `ERROR: ${updateError.message}` : 'SUCCESS');
          if (!updateError) {
            syncedCount++;
          }
        }
      } else {
        // Create new event using service client
        const { error: insertError } = await serviceClient.from(this.tableName).insert({
          tenant_id: tenantId,
          title: newTitle,
          description: plan.notes,
          start_at: plan.target_date,
          all_day: true,
          timezone: 'UTC',
          category_id: category?.id || null,
          event_type: 'discipleship',
          status: 'scheduled',
          priority: 'normal',
          source_type: 'member_discipleship_plans',
          source_id: plan.id,
          member_id: plan.member_id,
          assigned_to: null, // mentor_name is text, not a user reference
          is_recurring: false,
          is_private: false,
          visibility: 'team',
          tags: ['discipleship', 'milestone'],
          metadata: { mentor_name: plan.mentor_name },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        console.log('[syncFromDiscipleshipPlans] Insert result:', insertError ? `ERROR: ${insertError.message}` : 'SUCCESS');
        if (!insertError) {
          syncedCount++;
        }
      }
    }

    return syncedCount;
  }

  async syncFromMemberBirthdays(): Promise<number> {
    const tenantId = await this.getTenantId();
    // Use service client to bypass RLS for reading members
    // This is a system-level sync operation that needs access regardless of user permissions
    const serviceClient = await getSupabaseServiceClient();
    let syncedCount = 0;

    // Fetch active members with birthdays using service client (bypasses RLS)
    const { data: members, error: membersError } = await serviceClient
      .from('members')
      .select('id, first_name, last_name, birthday')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('birthday', 'is', null);

    console.log('[syncFromMemberBirthdays] Found members with birthdays:', members?.length ?? 0, membersError ? `Error: ${membersError.message}` : '');

    if (membersError) {
      throw new Error(`Failed to fetch members for birthday sync: ${membersError.message}`);
    }

    if (!members) return 0;

    // Get the birthday category using service client
    const { data: category } = await serviceClient
      .from('calendar_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', 'birthday')
      .maybeSingle();

    console.log('[syncFromMemberBirthdays] Birthday category:', category?.id ?? 'NOT FOUND');

    for (const member of members) {
      // Use member.id as source_id (source_type differentiates birthday from anniversary)
      const sourceId = member.id;

      // Decrypt member name (PII fields are encrypted)
      const { firstName, lastName } = await this.decryptMemberName(
        tenantId,
        member.first_name,
        member.last_name
      );

      // Get existing event for this source (if any) using service client
      const { data: existingEvents } = await serviceClient
        .from(this.tableName)
        .select('id, start_at, title')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'member_birthday')
        .eq('source_id', sourceId)
        .is('deleted_at', null)
        .limit(1);

      const existingEvent = existingEvents?.[0];
      const memberName = `${firstName} ${lastName}`;
      const newTitle = `🎂 ${memberName}'s Birthday`;

      // For birthdays, we use the current year's occurrence
      const birthdayDate = new Date(member.birthday);
      const currentYear = new Date().getFullYear();
      const thisYearBirthday = new Date(currentYear, birthdayDate.getMonth(), birthdayDate.getDate());
      const startAt = thisYearBirthday.toISOString();

      console.log('[syncFromMemberBirthdays] Processing member:', memberName, 'sourceId:', sourceId, 'existingEvent:', existingEvent?.id ?? 'NONE');

      const newDescription = `Birthday celebration for ${memberName}`;

      if (existingEvent) {
        // Always update to ensure decrypted names are used - using service client
        const { error: updateError } = await serviceClient
          .from(this.tableName)
          .update({
            title: newTitle,
            description: newDescription,
            start_at: startAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEvent.id);

        console.log('[syncFromMemberBirthdays] Update result:', updateError ? `ERROR: ${updateError.message}` : 'SUCCESS');
        if (!updateError) {
          syncedCount++;
        }
      } else {
        // Create new recurring birthday event using service client
        const { error: insertError } = await serviceClient.from(this.tableName).insert({
          tenant_id: tenantId,
          title: newTitle,
          description: newDescription,
          start_at: startAt,
          all_day: true,
          timezone: 'UTC',
          category_id: category?.id || null,
          event_type: 'birthday',
          status: 'scheduled',
          priority: 'normal',
          source_type: 'member_birthday',
          source_id: sourceId,
          member_id: member.id,
          assigned_to: null,
          is_recurring: true,
          recurrence_rule: 'FREQ=YEARLY',
          is_private: false,
          visibility: 'team',
          tags: ['birthday', 'celebration'],
          metadata: { original_date: member.birthday },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        console.log('[syncFromMemberBirthdays] Insert result:', insertError ? `ERROR: ${insertError.message}` : 'SUCCESS');
        if (!insertError) {
          syncedCount++;
        }
      }
    }

    return syncedCount;
  }

  async syncFromMemberAnniversaries(): Promise<number> {
    const tenantId = await this.getTenantId();
    // Use service client to bypass RLS for reading members
    // This is a system-level sync operation that needs access regardless of user permissions
    const serviceClient = await getSupabaseServiceClient();
    let syncedCount = 0;

    // Fetch active members with anniversaries using service client (bypasses RLS)
    const { data: members, error: membersError } = await serviceClient
      .from('members')
      .select('id, first_name, last_name, anniversary')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('anniversary', 'is', null);

    console.log('[syncFromMemberAnniversaries] Found members with anniversaries:', members?.length ?? 0, membersError ? `Error: ${membersError.message}` : '');

    if (membersError) {
      throw new Error(`Failed to fetch members for anniversary sync: ${membersError.message}`);
    }

    if (!members) return 0;

    // Get the anniversary category using service client
    const { data: category } = await serviceClient
      .from('calendar_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', 'anniversary')
      .maybeSingle();

    console.log('[syncFromMemberAnniversaries] Anniversary category:', category?.id ?? 'NOT FOUND');

    for (const member of members) {
      // Use member.id as source_id (source_type differentiates birthday from anniversary)
      const sourceId = member.id;

      // Decrypt member name (PII fields are encrypted)
      const { firstName, lastName } = await this.decryptMemberName(
        tenantId,
        member.first_name,
        member.last_name
      );

      // Get existing event for this source (if any) using service client
      const { data: existingEvents } = await serviceClient
        .from(this.tableName)
        .select('id, start_at, title')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'member_anniversary')
        .eq('source_id', sourceId)
        .is('deleted_at', null)
        .limit(1);

      const existingEvent = existingEvents?.[0];
      const memberName = `${firstName} ${lastName}`;
      const newTitle = `💍 ${memberName}'s Wedding Anniversary`;

      // For anniversaries, we use the current year's occurrence
      const anniversaryDate = new Date(member.anniversary);
      const currentYear = new Date().getFullYear();
      const thisYearAnniversary = new Date(currentYear, anniversaryDate.getMonth(), anniversaryDate.getDate());
      const startAt = thisYearAnniversary.toISOString();

      console.log('[syncFromMemberAnniversaries] Processing member:', memberName, 'sourceId:', sourceId, 'existingEvent:', existingEvent?.id ?? 'NONE');

      const newDescription = `Wedding anniversary celebration for ${memberName}`;

      if (existingEvent) {
        // Always update to ensure decrypted names are used - using service client
        const { error: updateError } = await serviceClient
          .from(this.tableName)
          .update({
            title: newTitle,
            description: newDescription,
            start_at: startAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEvent.id);

        console.log('[syncFromMemberAnniversaries] Update result:', updateError ? `ERROR: ${updateError.message}` : 'SUCCESS');
        if (!updateError) {
          syncedCount++;
        }
      } else {
        // Create new recurring anniversary event using service client
        const { error: insertError } = await serviceClient.from(this.tableName).insert({
          tenant_id: tenantId,
          title: newTitle,
          description: newDescription,
          start_at: startAt,
          all_day: true,
          timezone: 'UTC',
          category_id: category?.id || null,
          event_type: 'anniversary',
          status: 'scheduled',
          priority: 'normal',
          source_type: 'member_anniversary',
          source_id: sourceId,
          member_id: member.id,
          assigned_to: null,
          is_recurring: true,
          recurrence_rule: 'FREQ=YEARLY',
          is_private: false,
          visibility: 'team',
          tags: ['anniversary', 'celebration'],
          metadata: { original_date: member.anniversary },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        console.log('[syncFromMemberAnniversaries] Insert result:', insertError ? `ERROR: ${insertError.message}` : 'SUCCESS');
        if (!insertError) {
          syncedCount++;
        }
      }
    }

    return syncedCount;
  }

  /**
   * Sync all schedule occurrences to calendar events
   * Creates/updates calendar events for each active schedule occurrence
   */
  async syncFromScheduleOccurrences(): Promise<number> {
    const tenantId = await this.getTenantId();
    const serviceClient = await getSupabaseServiceClient();
    let syncedCount = 0;

    // Fetch all active schedule occurrences with their schedule and ministry info
    const { data: occurrences, error: occurrencesError } = await serviceClient
      .from('schedule_occurrences')
      .select(`
        id,
        schedule_id,
        start_at,
        end_at,
        status,
        title_override,
        location_override,
        notes,
        capacity,
        registration_count,
        attendance_count,
        ministry_schedules (
          id,
          title,
          description,
          location,
          ministry_id,
          event_type,
          registration_enabled,
          ministries (
            id,
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_at', new Date().toISOString());

    console.log('[syncFromScheduleOccurrences] Found occurrences:', occurrences?.length ?? 0, occurrencesError ? `Error: ${occurrencesError.message}` : '');

    if (occurrencesError) {
      throw new Error(`Failed to fetch schedule occurrences for sync: ${occurrencesError.message}`);
    }

    if (!occurrences) return 0;

    // Get the schedule category (or create/use 'event' category)
    const { data: category } = await serviceClient
      .from('calendar_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', 'event')
      .maybeSingle();

    console.log('[syncFromScheduleOccurrences] Event category:', category?.id ?? 'NOT FOUND');

    for (const occurrence of occurrences as unknown as Array<{
      id: string;
      schedule_id: string;
      start_at: string;
      end_at: string | null;
      status: string;
      title_override: string | null;
      location_override: string | null;
      notes: string | null;
      capacity: number | null;
      registration_count: number;
      attendance_count: number;
      ministry_schedules: {
        id: string;
        title: string;
        description: string | null;
        location: string | null;
        ministry_id: string;
        event_type: string;
        registration_enabled: boolean;
        ministries: { id: string; name: string } | null;
      } | null;
    }>) {
      const schedule = occurrence.ministry_schedules;
      if (!schedule) continue;

      // Get existing event for this source (if any)
      const { data: existingEvents } = await serviceClient
        .from(this.tableName)
        .select('id, start_at, end_at, title, description, location, status')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'schedule_occurrence')
        .eq('source_id', occurrence.id)
        .is('deleted_at', null)
        .limit(1);

      const existingEvent = existingEvents?.[0];

      // Build event data
      const ministryName = schedule.ministries?.name || 'Ministry';
      const eventTitle = occurrence.title_override || schedule.title;
      const eventDescription = occurrence.notes || schedule.description || '';
      const eventLocation = occurrence.location_override || schedule.location || '';
      const eventStatus = occurrence.status === 'cancelled' ? 'cancelled' : 'scheduled';

      // Build metadata with scheduler-specific info
      const metadata = {
        schedule_id: occurrence.schedule_id,
        ministry_id: schedule.ministry_id,
        ministry_name: ministryName,
        event_type: schedule.event_type,
        capacity: occurrence.capacity,
        registration_count: occurrence.registration_count,
        attendance_count: occurrence.attendance_count,
        registration_enabled: schedule.registration_enabled,
      };

      console.log('[syncFromScheduleOccurrences] Processing occurrence:', occurrence.id, 'existingEvent:', existingEvent?.id ?? 'NONE');

      if (existingEvent) {
        // Check if any data has changed
        const dateChanged = existingEvent.start_at !== occurrence.start_at || existingEvent.end_at !== occurrence.end_at;
        const titleChanged = existingEvent.title !== eventTitle;
        const descriptionChanged = existingEvent.description !== eventDescription;
        const locationChanged = existingEvent.location !== eventLocation;
        const statusChanged = existingEvent.status !== eventStatus;

        if (dateChanged || titleChanged || descriptionChanged || locationChanged || statusChanged) {
          const { error: updateError } = await serviceClient
            .from(this.tableName)
            .update({
              title: eventTitle,
              description: eventDescription,
              location: eventLocation,
              start_at: occurrence.start_at,
              end_at: occurrence.end_at,
              status: eventStatus,
              metadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingEvent.id);

          console.log('[syncFromScheduleOccurrences] Update result:', updateError ? `ERROR: ${updateError.message}` : 'SUCCESS');
          if (!updateError) {
            syncedCount++;
          }
        }
      } else {
        // Create new calendar event
        const { error: insertError } = await serviceClient.from(this.tableName).insert({
          tenant_id: tenantId,
          title: eventTitle,
          description: eventDescription,
          location: eventLocation,
          start_at: occurrence.start_at,
          end_at: occurrence.end_at,
          all_day: false,
          timezone: 'UTC',
          category_id: category?.id || null,
          event_type: 'schedule',
          status: eventStatus,
          priority: 'normal',
          source_type: 'schedule_occurrence',
          source_id: occurrence.id,
          member_id: null,
          assigned_to: null,
          is_recurring: false,
          is_private: false,
          visibility: 'public',
          tags: ['scheduler', schedule.event_type, ministryName.toLowerCase().replace(/\s+/g, '-')],
          metadata,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        console.log('[syncFromScheduleOccurrences] Insert result:', insertError ? `ERROR: ${insertError.message}` : 'SUCCESS');
        if (!insertError) {
          syncedCount++;
        }
      }
    }

    return syncedCount;
  }

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
        title_override,
        location_override,
        notes,
        capacity,
        registration_count,
        attendance_count,
        ministry_schedules (
          id,
          title,
          description,
          location,
          ministry_id,
          event_type,
          registration_enabled,
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
      title_override: string | null;
      location_override: string | null;
      notes: string | null;
      capacity: number | null;
      registration_count: number;
      attendance_count: number;
      ministry_schedules: {
        id: string;
        title: string;
        description: string | null;
        location: string | null;
        ministry_id: string;
        event_type: string;
        registration_enabled: boolean;
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
    const eventTitle = typedOccurrence.title_override || schedule.title;
    const eventDescription = typedOccurrence.notes || schedule.description || '';
    const eventLocation = typedOccurrence.location_override || schedule.location || '';

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
      event_type: schedule.event_type,
      capacity: typedOccurrence.capacity,
      registration_count: typedOccurrence.registration_count,
      attendance_count: typedOccurrence.attendance_count,
      registration_enabled: schedule.registration_enabled,
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
        tags: ['scheduler', schedule.event_type, ministryName.toLowerCase().replace(/\s+/g, '-')],
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
