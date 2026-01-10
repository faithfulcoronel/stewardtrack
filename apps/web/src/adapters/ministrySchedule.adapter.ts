import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  MinistrySchedule,
  MinistryScheduleWithMinistry,
  MinistryScheduleCreateInput,
  MinistryScheduleUpdateInput,
  MinistryScheduleFilters,
} from '@/models/scheduler/ministrySchedule.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IMinistryScheduleAdapter extends IBaseAdapter<MinistrySchedule> {
  getAll(tenantId: string): Promise<MinistryScheduleWithMinistry[]>;
  getById(id: string, tenantId: string): Promise<MinistryScheduleWithMinistry | null>;
  getByMinistry(ministryId: string, tenantId: string): Promise<MinistrySchedule[]>;
  getByFilters(filters: MinistryScheduleFilters, tenantId: string): Promise<MinistryScheduleWithMinistry[]>;
  getActive(tenantId: string): Promise<MinistryScheduleWithMinistry[]>;
  createSchedule(data: MinistryScheduleCreateInput, tenantId: string, userId?: string): Promise<MinistrySchedule>;
  updateSchedule(id: string, data: MinistryScheduleUpdateInput, tenantId: string, userId?: string): Promise<MinistrySchedule>;
  softDelete(id: string, tenantId: string): Promise<void>;
}

@injectable()
export class MinistryScheduleAdapter
  extends BaseAdapter<MinistrySchedule>
  implements IMinistryScheduleAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'ministry_schedules';

  protected defaultSelect = `
    id,
    tenant_id,
    ministry_id,
    name,
    description,
    schedule_type,
    start_time,
    end_time,
    duration_minutes,
    timezone,
    recurrence_rule,
    recurrence_start_date,
    recurrence_end_date,
    location,
    location_type,
    virtual_meeting_url,
    capacity,
    waitlist_enabled,
    registration_required,
    registration_opens_days_before,
    registration_closes_hours_before,
    registration_form_schema,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  protected selectWithMinistry = `
    ${this.defaultSelect},
    ministry:ministries!ministry_id(
      id,
      name,
      code,
      color,
      icon
    )
  `;

  async getAll(tenantId: string): Promise<MinistryScheduleWithMinistry[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMinistry)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch schedules: ${error.message}`);
    }

    return (data as unknown as MinistryScheduleWithMinistry[]) || [];
  }

  async getById(id: string, tenantId: string): Promise<MinistryScheduleWithMinistry | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMinistry)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch schedule: ${error.message}`);
    }

    return data as unknown as MinistryScheduleWithMinistry | null;
  }

  async getByMinistry(ministryId: string, tenantId: string): Promise<MinistrySchedule[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('ministry_id', ministryId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ministry schedules: ${error.message}`);
    }

    return (data as unknown as MinistrySchedule[]) || [];
  }

  async getByFilters(filters: MinistryScheduleFilters, tenantId: string): Promise<MinistryScheduleWithMinistry[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.selectWithMinistry)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (filters.ministryId) {
      query = query.eq('ministry_id', filters.ministryId);
    }

    if (filters.scheduleType) {
      query = query.eq('schedule_type', filters.scheduleType);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters.startDateFrom) {
      query = query.gte('recurrence_start_date', filters.startDateFrom);
    }

    if (filters.startDateTo) {
      query = query.lte('recurrence_start_date', filters.startDateTo);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch schedules by filters: ${error.message}`);
    }

    return (data as unknown as MinistryScheduleWithMinistry[]) || [];
  }

  async getActive(tenantId: string): Promise<MinistryScheduleWithMinistry[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMinistry)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active schedules: ${error.message}`);
    }

    return (data as unknown as MinistryScheduleWithMinistry[]) || [];
  }

  async createSchedule(data: MinistryScheduleCreateInput, tenantId: string, userId?: string): Promise<MinistrySchedule> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        ministry_id: data.ministry_id,
        name: data.name,
        description: data.description ?? null,
        schedule_type: data.schedule_type ?? 'service',
        start_time: data.start_time,
        end_time: data.end_time ?? null,
        duration_minutes: data.duration_minutes ?? null,
        timezone: data.timezone ?? 'UTC',
        recurrence_rule: data.recurrence_rule ?? null,
        recurrence_start_date: data.recurrence_start_date,
        recurrence_end_date: data.recurrence_end_date ?? null,
        location: data.location ?? null,
        location_type: data.location_type ?? 'physical',
        virtual_meeting_url: data.virtual_meeting_url ?? null,
        capacity: data.capacity ?? null,
        waitlist_enabled: data.waitlist_enabled ?? false,
        registration_required: data.registration_required ?? false,
        registration_opens_days_before: data.registration_opens_days_before ?? 7,
        registration_closes_hours_before: data.registration_closes_hours_before ?? 1,
        registration_form_schema: data.registration_form_schema ?? [],
        is_active: data.is_active ?? true,
        created_by: userId ?? null,
        updated_by: userId ?? null,
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create schedule: missing response payload');
    }

    const schedule = result as unknown as MinistrySchedule;
    await this.auditService.logAuditEvent('create', 'ministry_schedules', schedule.id, schedule);

    return schedule;
  }

  async updateSchedule(id: string, data: MinistryScheduleUpdateInput, tenantId: string, userId?: string): Promise<MinistrySchedule> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: userId ?? null,
    };

    // Map all update fields
    const fields = [
      'name', 'description', 'schedule_type', 'start_time', 'end_time',
      'duration_minutes', 'timezone', 'recurrence_rule', 'recurrence_start_date',
      'recurrence_end_date', 'location', 'location_type', 'virtual_meeting_url',
      'capacity', 'waitlist_enabled', 'registration_required',
      'registration_opens_days_before', 'registration_closes_hours_before',
      'registration_form_schema', 'is_active'
    ];

    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updateData[field] = (data as Record<string, unknown>)[field];
      }
    }

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update schedule: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update schedule: not found');
    }

    const schedule = result as unknown as MinistrySchedule;
    await this.auditService.logAuditEvent('update', 'ministry_schedules', id, schedule);

    return schedule;
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete schedule: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'ministry_schedules', id, { id });
  }
}
