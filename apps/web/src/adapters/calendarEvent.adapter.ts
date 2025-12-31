import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import {
  CalendarEvent,
  CalendarEventFilters,
  CalendarEventView,
  CalendarEventType,
} from '@/models/calendarEvent.model';
import type { AuditService } from '@/services/AuditService';
import type { TenantService } from '@/services/TenantService';
import { TYPES } from '@/lib/types';
import { TenantContextError } from '@/utils/errorHandler';

export interface ICalendarEventAdapter extends IBaseAdapter<CalendarEvent> {
  getAll(): Promise<CalendarEvent[]>;
  getById(eventId: string): Promise<CalendarEvent | null>;
  getByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]>;
  getByFilters(filters: CalendarEventFilters): Promise<CalendarEvent[]>;
  getBySource(sourceType: string, sourceId: string): Promise<CalendarEvent[]>;
  existsBySource(sourceType: string, sourceId: string): Promise<boolean>;
  getByMember(memberId: string): Promise<CalendarEvent[]>;
  getUpcoming(days?: number): Promise<CalendarEvent[]>;
  getEventsForCalendarView(startDate: string, endDate: string): Promise<CalendarEventView[]>;
  syncFromCarePlans(): Promise<number>;
  syncFromDiscipleshipPlans(): Promise<number>;
}

@injectable()
export class CalendarEventAdapter
  extends BaseAdapter<CalendarEvent>
  implements ICalendarEventAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.TenantService) private tenantService: TenantService
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
    const supabase = await this.getSupabaseClient();
    let syncedCount = 0;

    // Fetch care plans with follow-up dates
    const { data: carePlans, error: carePlansError } = await supabase
      .from('member_care_plans')
      .select('id, member_id, status_label, status_code, follow_up_at, priority, details, assigned_to')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .not('follow_up_at', 'is', null);

    if (carePlansError) {
      throw new Error(`Failed to fetch care plans for sync: ${carePlansError.message}`);
    }

    if (!carePlans) return 0;

    // Get the care_plan category
    const { data: category } = await supabase
      .from('calendar_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', 'care_plan')
      .maybeSingle();

    for (const plan of carePlans) {
      // Check if event already exists (more efficient than fetching full records)
      const exists = await this.existsBySource('member_care_plans', plan.id);

      if (!exists) {
        // Create new event only if it doesn't exist
        const { error: insertError } = await supabase.from(this.tableName).insert({
          tenant_id: tenantId,
          title: `Care Plan: ${plan.status_label || plan.status_code || 'Follow-up'}`,
          description: plan.details,
          start_at: plan.follow_up_at,
          all_day: false,
          timezone: 'UTC',
          category_id: category?.id || null,
          event_type: 'care_plan',
          status: 'scheduled',
          priority: plan.priority || 'normal',
          source_type: 'member_care_plans',
          source_id: plan.id,
          member_id: plan.member_id,
          assigned_to: plan.assigned_to,
          is_recurring: false,
          is_private: false,
          visibility: 'team',
          tags: ['care-plan', 'follow-up'],
          metadata: {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (!insertError) {
          syncedCount++;
        }
      }
    }

    return syncedCount;
  }

  async syncFromDiscipleshipPlans(): Promise<number> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    let syncedCount = 0;

    // Fetch discipleship plans with target dates
    const { data: discipleshipPlans, error: plansError } = await supabase
      .from('member_discipleship_plans')
      .select('id, member_id, pathway, status, target_date, mentor_name, notes')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .not('target_date', 'is', null);

    if (plansError) {
      throw new Error(`Failed to fetch discipleship plans for sync: ${plansError.message}`);
    }

    if (!discipleshipPlans) return 0;

    // Get the discipleship category
    const { data: category } = await supabase
      .from('calendar_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', 'discipleship')
      .maybeSingle();

    for (const plan of discipleshipPlans) {
      // Check if event already exists (more efficient than fetching full records)
      const exists = await this.existsBySource('member_discipleship_plans', plan.id);

      if (!exists) {
        // Create new event only if it doesn't exist
        const { error: insertError } = await supabase.from(this.tableName).insert({
          tenant_id: tenantId,
          title: `Discipleship: ${plan.pathway || plan.status || 'Milestone'}`,
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

        if (!insertError) {
          syncedCount++;
        }
      }
    }

    return syncedCount;
  }
}
