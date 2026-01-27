/**
 * Ministry Adapter
 *
 * Data access layer for ministry records.
 * Handles direct database operations for ministries and teams.
 *
 * @module planner.ministries
 * @featureCode planner.ministries
 *
 * @permission ministries:view - Required to read ministry data
 * @permission ministries:manage - Required to create/update ministries
 * @permission ministries:delete - Required to soft-delete ministries
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  Ministry,
  MinistryWithLeader,
  MinistryWithTeam,
  MinistryCreateInput,
  MinistryUpdateInput,
  MinistryFilters,
} from '@/models/scheduler/ministry.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IMinistryAdapter extends IBaseAdapter<Ministry> {
  getAll(tenantId: string): Promise<Ministry[]>;
  getById(id: string, tenantId: string): Promise<MinistryWithLeader | null>;
  getByCode(code: string, tenantId: string): Promise<Ministry | null>;
  getByFilters(filters: MinistryFilters, tenantId: string): Promise<Ministry[]>;
  getWithTeamCounts(tenantId: string): Promise<MinistryWithTeam[]>;
  createMinistry(data: MinistryCreateInput, tenantId: string, userId?: string): Promise<Ministry>;
  updateMinistry(id: string, data: MinistryUpdateInput, tenantId: string, userId?: string): Promise<Ministry>;
  softDelete(id: string, tenantId: string): Promise<void>;
}

@injectable()
export class MinistryAdapter
  extends BaseAdapter<Ministry>
  implements IMinistryAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'ministries';

  protected defaultSelect = `
    id,
    tenant_id,
    name,
    code,
    description,
    category,
    leader_id,
    color,
    icon,
    is_active,
    sort_order,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  protected selectWithLeader = `
    ${this.defaultSelect},
    leader:members!leader_id(
      id,
      first_name,
      last_name,
      email
    )
  `;

  async getAll(tenantId: string): Promise<Ministry[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ministries: ${error.message}`);
    }

    return (data as unknown as Ministry[]) || [];
  }

  async getById(id: string, tenantId: string): Promise<MinistryWithLeader | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithLeader)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch ministry: ${error.message}`);
    }

    return data as MinistryWithLeader | null;
  }

  async getByCode(code: string, tenantId: string): Promise<Ministry | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('code', code)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch ministry by code: ${error.message}`);
    }

    return data as Ministry | null;
  }

  async getByFilters(filters: MinistryFilters, tenantId: string): Promise<Ministry[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.selectWithLeader)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters.leaderId) {
      query = query.eq('leader_id', filters.leaderId);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ministries by filters: ${error.message}`);
    }

    return (data as unknown as Ministry[]) || [];
  }

  async getWithTeamCounts(tenantId: string): Promise<MinistryWithTeam[]> {
    const supabase = await this.getSupabaseClient();

    // Get ministries with leader info
    const { data: ministries, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithLeader)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ministries: ${error.message}`);
    }

    if (!ministries || ministries.length === 0) {
      return [];
    }

    const typedMinistries = ministries as unknown as MinistryWithLeader[];

    // Get team counts for each ministry
    const ministryIds = typedMinistries.map((m) => m.id);

    const { data: teamCounts } = await supabase
      .from('ministry_teams')
      .select('ministry_id')
      .in('ministry_id', ministryIds)
      .eq('status', 'active');

    const { data: scheduleCounts } = await supabase
      .from('ministry_schedules')
      .select('ministry_id')
      .in('ministry_id', ministryIds)
      .eq('is_active', true)
      .is('deleted_at', null);

    // Count by ministry
    const teamCountMap = new Map<string, number>();
    const scheduleCountMap = new Map<string, number>();

    (teamCounts || []).forEach((tc: { ministry_id: string }) => {
      teamCountMap.set(tc.ministry_id, (teamCountMap.get(tc.ministry_id) || 0) + 1);
    });

    (scheduleCounts || []).forEach((sc: { ministry_id: string }) => {
      scheduleCountMap.set(sc.ministry_id, (scheduleCountMap.get(sc.ministry_id) || 0) + 1);
    });

    return typedMinistries.map((ministry) => ({
      ...ministry,
      team_count: teamCountMap.get(ministry.id) || 0,
      schedule_count: scheduleCountMap.get(ministry.id) || 0,
    }));
  }

  async createMinistry(data: MinistryCreateInput, tenantId: string, userId?: string): Promise<Ministry> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        category: data.category ?? 'general',
        leader_id: data.leader_id ?? null,
        color: data.color ?? '#3B82F6',
        icon: data.icon ?? 'users',
        is_active: data.is_active ?? true,
        sort_order: data.sort_order ?? 0,
        created_by: userId ?? null,
        updated_by: userId ?? null,
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create ministry: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create ministry: missing response payload');
    }

    const ministry = result as unknown as Ministry;
    await this.auditService.logAuditEvent('create', 'ministries', ministry.id, ministry);

    return ministry;
  }

  async updateMinistry(id: string, data: MinistryUpdateInput, tenantId: string, userId?: string): Promise<Ministry> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: userId ?? null,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.leader_id !== undefined) updateData.leader_id = data.leader_id;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update ministry: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update ministry: ministry not found');
    }

    const ministry = result as unknown as Ministry;
    await this.auditService.logAuditEvent('update', 'ministries', id, ministry);

    return ministry;
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
      throw new Error(`Failed to delete ministry: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'ministries', id, { id });
  }
}
