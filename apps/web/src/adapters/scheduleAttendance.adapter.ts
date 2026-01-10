import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  ScheduleAttendance,
  ScheduleAttendanceWithMember,
  ScheduleAttendanceCreateInput,
  ScheduleAttendanceFilters,
} from '@/models/scheduler/scheduleAttendance.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IScheduleAttendanceAdapter extends IBaseAdapter<ScheduleAttendance> {
  getById(id: string, tenantId: string): Promise<ScheduleAttendanceWithMember | null>;
  getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleAttendanceWithMember[]>;
  getByMember(memberId: string, tenantId: string): Promise<ScheduleAttendance[]>;
  getByFilters(filters: ScheduleAttendanceFilters, tenantId: string): Promise<ScheduleAttendanceWithMember[]>;
  getByOccurrenceAndMember(occurrenceId: string, memberId: string, tenantId: string): Promise<ScheduleAttendance | null>;
  createAttendance(data: ScheduleAttendanceCreateInput, tenantId: string, userId?: string): Promise<ScheduleAttendance>;
  checkout(id: string, tenantId: string): Promise<ScheduleAttendance>;
  deleteAttendance(id: string, tenantId: string): Promise<void>;
  getAttendanceCount(occurrenceId: string, tenantId: string): Promise<number>;
  getAttendanceByMethod(occurrenceId: string, tenantId: string): Promise<{ method: string; count: number }[]>;
}

@injectable()
export class ScheduleAttendanceAdapter
  extends BaseAdapter<ScheduleAttendance>
  implements IScheduleAttendanceAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'schedule_attendance';

  protected defaultSelect = `
    id,
    tenant_id,
    occurrence_id,
    member_id,
    registration_id,
    guest_name,
    checked_in_at,
    checked_in_by,
    checkin_method,
    qr_token_used,
    device_info,
    checked_out_at,
    created_at
  `;

  protected selectWithMember = `
    ${this.defaultSelect},
    member:members!member_id(
      id,
      first_name,
      last_name,
      email,
      phone,
      avatar_url
    ),
    checked_in_by_user:auth.users!checked_in_by(
      id,
      email,
      raw_user_meta_data
    )
  `;

  async getById(id: string, tenantId: string): Promise<ScheduleAttendanceWithMember | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }

    return data as unknown as ScheduleAttendanceWithMember | null;
  }

  async getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleAttendanceWithMember[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId)
      .order('checked_in_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch occurrence attendance: ${error.message}`);
    }

    return (data as unknown as ScheduleAttendanceWithMember[]) || [];
  }

  async getByMember(memberId: string, tenantId: string): Promise<ScheduleAttendance[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .order('checked_in_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch member attendance: ${error.message}`);
    }

    return (data as unknown as ScheduleAttendance[]) || [];
  }

  async getByFilters(filters: ScheduleAttendanceFilters, tenantId: string): Promise<ScheduleAttendanceWithMember[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('tenant_id', tenantId);

    if (filters.occurrenceId) {
      query = query.eq('occurrence_id', filters.occurrenceId);
    }

    if (filters.memberId) {
      query = query.eq('member_id', filters.memberId);
    }

    if (filters.checkinMethod) {
      query = query.eq('checkin_method', filters.checkinMethod);
    }

    if (filters.checkedInAfter) {
      query = query.gte('checked_in_at', filters.checkedInAfter);
    }

    if (filters.checkedInBefore) {
      query = query.lte('checked_in_at', filters.checkedInBefore);
    }

    const { data, error } = await query.order('checked_in_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch attendance by filters: ${error.message}`);
    }

    return (data as unknown as ScheduleAttendanceWithMember[]) || [];
  }

  async getByOccurrenceAndMember(occurrenceId: string, memberId: string, tenantId: string): Promise<ScheduleAttendance | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('occurrence_id', occurrenceId)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch attendance record: ${error.message}`);
    }

    return data as unknown as ScheduleAttendance | null;
  }

  async createAttendance(data: ScheduleAttendanceCreateInput, tenantId: string, userId?: string): Promise<ScheduleAttendance> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        occurrence_id: data.occurrence_id,
        member_id: data.member_id ?? null,
        registration_id: data.registration_id ?? null,
        guest_name: data.guest_name ?? null,
        checkin_method: data.checkin_method,
        qr_token_used: data.qr_token_used ?? null,
        device_info: data.device_info ?? {},
        checked_in_by: userId ?? null,
        checked_in_at: new Date().toISOString(),
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create attendance: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create attendance: missing response payload');
    }

    const attendance = result as unknown as ScheduleAttendance;
    await this.auditService.logAuditEvent('create', 'schedule_attendance', attendance.id, attendance);

    return attendance;
  }

  async checkout(id: string, tenantId: string): Promise<ScheduleAttendance> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        checked_out_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to checkout: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to checkout: attendance not found');
    }

    return result as unknown as ScheduleAttendance;
  }

  async deleteAttendance(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete attendance: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'schedule_attendance', id, { id });
  }

  async getAttendanceCount(occurrenceId: string, tenantId: string): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to count attendance: ${error.message}`);
    }

    return count ?? 0;
  }

  async getAttendanceByMethod(occurrenceId: string, tenantId: string): Promise<{ method: string; count: number }[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('checkin_method')
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to fetch attendance by method: ${error.message}`);
    }

    // Count by method
    const methodCounts = new Map<string, number>();
    ((data as unknown as { checkin_method: string }[]) || []).forEach((record) => {
      const method = record.checkin_method;
      methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
    });

    return Array.from(methodCounts.entries()).map(([method, count]) => ({ method, count }));
  }
}
