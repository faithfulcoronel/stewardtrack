import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  ScheduleOccurrence,
  ScheduleOccurrenceWithSchedule,
  ScheduleOccurrenceCreateInput,
  ScheduleOccurrenceUpdateInput,
  ScheduleOccurrenceFilters,
} from '@/models/scheduler/scheduleOccurrence.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IScheduleOccurrenceAdapter extends IBaseAdapter<ScheduleOccurrence> {
  getById(id: string, tenantId: string): Promise<ScheduleOccurrenceWithSchedule | null>;
  getBySchedule(scheduleId: string, tenantId: string): Promise<ScheduleOccurrence[]>;
  getByDateRange(startDate: string, endDate: string, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  getByFilters(filters: ScheduleOccurrenceFilters, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  getByQrToken(token: string): Promise<ScheduleOccurrenceWithSchedule | null>;
  getUpcoming(days: number, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  createOccurrence(data: ScheduleOccurrenceCreateInput, tenantId: string): Promise<ScheduleOccurrence>;
  createMany(occurrences: ScheduleOccurrenceCreateInput[], tenantId: string): Promise<ScheduleOccurrence[]>;
  updateOccurrence(id: string, data: ScheduleOccurrenceUpdateInput, tenantId: string): Promise<ScheduleOccurrence>;
  updateCounts(id: string, counts: { registered_count?: number; waitlist_count?: number; checked_in_count?: number }): Promise<void>;
}

@injectable()
export class ScheduleOccurrenceAdapter
  extends BaseAdapter<ScheduleOccurrence>
  implements IScheduleOccurrenceAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'schedule_occurrences';

  protected defaultSelect = `
    id,
    tenant_id,
    schedule_id,
    occurrence_date,
    start_at,
    end_at,
    override_name,
    override_description,
    override_location,
    override_capacity,
    status,
    cancellation_reason,
    registered_count,
    waitlist_count,
    checked_in_count,
    qr_token,
    qr_expires_at,
    calendar_event_id,
    created_at,
    updated_at
  `;

  protected selectWithSchedule = `
    ${this.defaultSelect},
    schedule:ministry_schedules!schedule_id(
      id,
      name,
      description,
      schedule_type,
      location,
      location_type,
      virtual_meeting_url,
      capacity,
      registration_required,
      registration_form_schema,
      ministry:ministries!ministry_id(
        id,
        name,
        code,
        color,
        icon
      )
    )
  `;

  async getById(id: string, tenantId: string): Promise<ScheduleOccurrenceWithSchedule | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithSchedule)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch occurrence: ${error.message}`);
    }

    return data as unknown as ScheduleOccurrenceWithSchedule | null;
  }

  async getBySchedule(scheduleId: string, tenantId: string): Promise<ScheduleOccurrence[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('schedule_id', scheduleId)
      .eq('tenant_id', tenantId)
      .order('occurrence_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch schedule occurrences: ${error.message}`);
    }

    return (data as unknown as ScheduleOccurrence[]) || [];
  }

  async getByDateRange(startDate: string, endDate: string, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithSchedule)
      .eq('tenant_id', tenantId)
      .gte('occurrence_date', startDate)
      .lte('occurrence_date', endDate)
      .order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch occurrences by date range: ${error.message}`);
    }

    return (data as unknown as ScheduleOccurrenceWithSchedule[]) || [];
  }

  async getByFilters(filters: ScheduleOccurrenceFilters, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.selectWithSchedule)
      .eq('tenant_id', tenantId);

    if (filters.scheduleId) {
      query = query.eq('schedule_id', filters.scheduleId);
    }

    if (filters.startDate) {
      query = query.gte('occurrence_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('occurrence_date', filters.endDate);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }

    const { data, error } = await query.order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch occurrences by filters: ${error.message}`);
    }

    // Filter by ministry if needed (post-query since it's nested)
    let results = (data as unknown as ScheduleOccurrenceWithSchedule[]) || [];
    if (filters.ministryId) {
      results = results.filter(occ => occ.schedule?.ministry?.id === filters.ministryId);
    }

    return results;
  }

  async getByQrToken(token: string): Promise<ScheduleOccurrenceWithSchedule | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithSchedule)
      .eq('qr_token', token)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch occurrence by QR token: ${error.message}`);
    }

    return data as unknown as ScheduleOccurrenceWithSchedule | null;
  }

  async getUpcoming(days: number, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    const supabase = await this.getSupabaseClient();

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithSchedule)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .gte('start_at', now.toISOString())
      .lte('start_at', futureDate.toISOString())
      .order('start_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch upcoming occurrences: ${error.message}`);
    }

    return (data as unknown as ScheduleOccurrenceWithSchedule[]) || [];
  }

  async createOccurrence(data: ScheduleOccurrenceCreateInput, tenantId: string): Promise<ScheduleOccurrence> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        schedule_id: data.schedule_id,
        occurrence_date: data.occurrence_date,
        start_at: data.start_at,
        end_at: data.end_at ?? null,
        override_name: data.override_name ?? null,
        override_description: data.override_description ?? null,
        override_location: data.override_location ?? null,
        override_capacity: data.override_capacity ?? null,
        status: data.status ?? 'scheduled',
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create occurrence: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create occurrence: missing response payload');
    }

    return result as unknown as ScheduleOccurrence;
  }

  async createMany(occurrences: ScheduleOccurrenceCreateInput[], tenantId: string): Promise<ScheduleOccurrence[]> {
    const supabase = await this.getSupabaseClient();

    const insertData = occurrences.map(data => ({
      tenant_id: tenantId,
      schedule_id: data.schedule_id,
      occurrence_date: data.occurrence_date,
      start_at: data.start_at,
      end_at: data.end_at ?? null,
      override_name: data.override_name ?? null,
      override_description: data.override_description ?? null,
      override_location: data.override_location ?? null,
      override_capacity: data.override_capacity ?? null,
      status: data.status ?? 'scheduled',
    }));

    const { data: results, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select(this.defaultSelect);

    if (error) {
      throw new Error(`Failed to create occurrences: ${error.message}`);
    }

    return (results as unknown as ScheduleOccurrence[]) || [];
  }

  async updateOccurrence(id: string, data: ScheduleOccurrenceUpdateInput, tenantId: string): Promise<ScheduleOccurrence> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const fields = [
      'occurrence_date', 'start_at', 'end_at', 'override_name',
      'override_description', 'override_location', 'override_capacity',
      'status', 'cancellation_reason', 'qr_token', 'qr_expires_at', 'calendar_event_id'
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
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update occurrence: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update occurrence: not found');
    }

    return result as unknown as ScheduleOccurrence;
  }

  async updateCounts(id: string, counts: { registered_count?: number; waitlist_count?: number; checked_in_count?: number }): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {};
    if (counts.registered_count !== undefined) updateData.registered_count = counts.registered_count;
    if (counts.waitlist_count !== undefined) updateData.waitlist_count = counts.waitlist_count;
    if (counts.checked_in_count !== undefined) updateData.checked_in_count = counts.checked_in_count;

    if (Object.keys(updateData).length === 0) return;

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update occurrence counts: ${error.message}`);
    }
  }
}
