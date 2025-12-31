/**
 * ================================================================================
 * MEMBER DISCIPLESHIP PLAN ADAPTER
 * ================================================================================
 *
 * ADAPTER PATTERN:
 * Adapters handle direct database communication and data transformation.
 * They extend BaseAdapter which provides common CRUD operations.
 *
 * KEY RESPONSIBILITIES:
 *   1. Define table name and column select
 *   2. Handle tenant isolation (multi-tenancy)
 *   3. Log audit events for compliance
 *   4. Provide domain-specific query methods
 *
 * TENANT ISOLATION:
 * All queries filter by tenant_id to ensure data isolation in multi-tenant SaaS.
 * The TenantService provides the current tenant context from the request.
 *
 * ================================================================================
 */

import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';
import type { AuditService } from '@/services/AuditService';
import type { TenantService } from '@/services/TenantService';
import { TYPES } from '@/lib/types';
import { TenantContextError } from '@/utils/errorHandler';

/**
 * Extended interface for discipleship plan adapter
 * Adds domain-specific methods beyond base CRUD
 */
export interface IMemberDiscipleshipPlanAdapter extends IBaseAdapter<MemberDiscipleshipPlan> {
  getAll(): Promise<MemberDiscipleshipPlan[]>;
  getById(planId: string): Promise<MemberDiscipleshipPlan | null>;
  getByMember(memberId: string): Promise<MemberDiscipleshipPlan[]>;
}

@injectable()
export class MemberDiscipleshipPlanAdapter
  extends BaseAdapter<MemberDiscipleshipPlan>
  implements IMemberDiscipleshipPlanAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.TenantService) private tenantService: TenantService
  ) {
    super();
  }

  /**
   * Get current tenant ID or throw if not available
   * PATTERN: Always validate tenant context before database operations
   */
  private async getTenantId(): Promise<string> {
    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      throw new TenantContextError('No tenant context available');
    }
    return tenant.id;
  }

  protected tableName = 'member_discipleship_plans';

  /**
   * Column selection matching database schema
   * NOTE: Update this if database schema changes
   *
   * SCHEMA (from migration 20250925000000_membership_stage_center_features.sql):
   *   mentor_name (not mentor)
   *   small_group
   *   target_date
   *   status
   */
  protected defaultSelect = `
    id,
    tenant_id,
    member_id,
    pathway,
    next_step,
    mentor_name,
    small_group,
    target_date,
    status,
    notes,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  // ==================== LIFECYCLE HOOKS ====================

  protected override async onAfterCreate(data: MemberDiscipleshipPlan): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_discipleship_plans', data.id, data);
  }

  protected override async onAfterUpdate(data: MemberDiscipleshipPlan): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_discipleship_plans', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_discipleship_plans', id, { id });
  }

  // ==================== DOMAIN-SPECIFIC METHODS ====================

  /**
   * Get all discipleship plans for the current tenant (non-deleted)
   */
  async getAll(): Promise<MemberDiscipleshipPlan[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find discipleship plans: ${error.message}`);
    }

    return (data || []) as unknown as MemberDiscipleshipPlan[];
  }

  /**
   * Get a discipleship plan by ID within the current tenant (tenant-scoped)
   */
  async getById(planId: string): Promise<MemberDiscipleshipPlan | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', planId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find discipleship plan by ID: ${error.message}`);
    }

    return data as MemberDiscipleshipPlan | null;
  }

  /**
   * Get all discipleship plans for a specific member within the current tenant
   */
  async getByMember(memberId: string): Promise<MemberDiscipleshipPlan[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find discipleship plans by member: ${error.message}`);
    }

    return (data || []) as unknown as MemberDiscipleshipPlan[];
  }
}
