import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  ScheduleTeamAssignment,
  ScheduleTeamAssignmentWithMember,
  ScheduleTeamAssignmentCreateInput,
  ScheduleTeamAssignmentUpdateInput,
} from '@/models/scheduler/scheduleTeamAssignment.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IScheduleTeamAssignmentAdapter extends IBaseAdapter<ScheduleTeamAssignment> {
  getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleTeamAssignmentWithMember[]>;
  getByMember(memberId: string, tenantId: string): Promise<ScheduleTeamAssignment[]>;
  getByOccurrenceAndMember(occurrenceId: string, memberId: string, tenantId: string): Promise<ScheduleTeamAssignment | null>;
  getPendingByMember(memberId: string, tenantId: string): Promise<ScheduleTeamAssignmentWithMember[]>;
  createAssignment(data: ScheduleTeamAssignmentCreateInput, tenantId: string): Promise<ScheduleTeamAssignment>;
  updateAssignment(id: string, data: ScheduleTeamAssignmentUpdateInput, tenantId: string): Promise<ScheduleTeamAssignment>;
  deleteAssignment(id: string, tenantId: string): Promise<void>;
  confirmAssignment(id: string, tenantId: string): Promise<ScheduleTeamAssignment>;
  declineAssignment(id: string, reason: string, tenantId: string): Promise<ScheduleTeamAssignment>;
}

@injectable()
export class ScheduleTeamAssignmentAdapter
  extends BaseAdapter<ScheduleTeamAssignment>
  implements IScheduleTeamAssignmentAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'schedule_team_assignments';

  protected defaultSelect = `
    id,
    tenant_id,
    occurrence_id,
    member_id,
    assigned_role,
    is_adhoc,
    volunteer_name,
    volunteer_contact,
    status,
    confirmed_at,
    declined_reason,
    created_at,
    updated_at
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
    occurrence:schedule_occurrences!occurrence_id(
      id,
      occurrence_date,
      start_at,
      end_at,
      status,
      schedule:ministry_schedules!schedule_id(
        id,
        name,
        ministry:ministries!ministry_id(
          id,
          name,
          color
        )
      )
    )
  `;

  async getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleTeamAssignmentWithMember[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('occurrence_id', occurrenceId)
      .eq('tenant_id', tenantId)
      .order('assigned_role', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch team assignments: ${error.message}`);
    }

    return (data as unknown as ScheduleTeamAssignmentWithMember[]) || [];
  }

  async getByMember(memberId: string, tenantId: string): Promise<ScheduleTeamAssignment[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch member assignments: ${error.message}`);
    }

    return (data as unknown as ScheduleTeamAssignment[]) || [];
  }

  async getByOccurrenceAndMember(occurrenceId: string, memberId: string, tenantId: string): Promise<ScheduleTeamAssignment | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('occurrence_id', occurrenceId)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch assignment: ${error.message}`);
    }

    return data as unknown as ScheduleTeamAssignment | null;
  }

  async getPendingByMember(memberId: string, tenantId: string): Promise<ScheduleTeamAssignmentWithMember[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch pending assignments: ${error.message}`);
    }

    return (data as unknown as ScheduleTeamAssignmentWithMember[]) || [];
  }

  async createAssignment(data: ScheduleTeamAssignmentCreateInput, tenantId: string): Promise<ScheduleTeamAssignment> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        occurrence_id: data.occurrence_id,
        member_id: data.member_id ?? null,
        assigned_role: data.assigned_role,
        is_adhoc: data.is_adhoc ?? false,
        volunteer_name: data.volunteer_name ?? null,
        volunteer_contact: data.volunteer_contact ?? null,
        status: data.status ?? 'pending',
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create assignment: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create assignment: missing response payload');
    }

    const assignment = result as unknown as ScheduleTeamAssignment;
    await this.auditService.logAuditEvent('create', 'schedule_team_assignments', assignment.id, assignment);

    return assignment;
  }

  async updateAssignment(id: string, data: ScheduleTeamAssignmentUpdateInput, tenantId: string): Promise<ScheduleTeamAssignment> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.assigned_role !== undefined) updateData.assigned_role = data.assigned_role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.volunteer_name !== undefined) updateData.volunteer_name = data.volunteer_name;
    if (data.volunteer_contact !== undefined) updateData.volunteer_contact = data.volunteer_contact;
    if (data.confirmed_at !== undefined) updateData.confirmed_at = data.confirmed_at;
    if (data.declined_reason !== undefined) updateData.declined_reason = data.declined_reason;

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update assignment: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update assignment: not found');
    }

    const assignment = result as unknown as ScheduleTeamAssignment;
    await this.auditService.logAuditEvent('update', 'schedule_team_assignments', id, assignment);

    return assignment;
  }

  async deleteAssignment(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete assignment: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'schedule_team_assignments', id, { id });
  }

  async confirmAssignment(id: string, tenantId: string): Promise<ScheduleTeamAssignment> {
    return this.updateAssignment(id, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    }, tenantId);
  }

  async declineAssignment(id: string, reason: string, tenantId: string): Promise<ScheduleTeamAssignment> {
    return this.updateAssignment(id, {
      status: 'declined',
      declined_reason: reason,
    }, tenantId);
  }
}
