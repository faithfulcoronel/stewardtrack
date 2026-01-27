import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MemberCarePlan } from '@/models/memberCarePlan.model';
import type { AuditService } from '@/services/AuditService';
import type { TenantService } from '@/services/TenantService';
import { TYPES } from '@/lib/types';
import { TenantContextError } from '@/utils/errorHandler';

/**
 * Adapter interface for member care plan database operations.
 *
 * @module members.care
 *
 * @permission careplans:view - Required for read operations
 * @permission careplans:manage - Required for create/update operations
 * @permission careplans:delete - Required for delete operations
 */
export interface IMemberCarePlanAdapter extends IBaseAdapter<MemberCarePlan> {
  getAll(): Promise<MemberCarePlan[]>;
  getAllWithMembers(): Promise<MemberCarePlan[]>;
  getById(carePlanId: string): Promise<MemberCarePlan | null>;
  getByMember(memberId: string): Promise<MemberCarePlan[]>;
}

/**
 * Adapter implementation for member care plan database operations.
 *
 * @module members.care
 *
 * @permission careplans:view - Required for read operations
 * @permission careplans:manage - Required for create/update operations
 * @permission careplans:delete - Required for delete operations
 */
@injectable()
export class MemberCarePlanAdapter
  extends BaseAdapter<MemberCarePlan>
  implements IMemberCarePlanAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.TenantService) private tenantService: TenantService
  ) {
    super();
  }

  /**
   * Get current tenant ID or throw if not available
   */
  private async getTenantId(): Promise<string> {
    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      throw new TenantContextError('No tenant context available');
    }
    return tenant.id;
  }

  protected tableName = 'member_care_plans';

  protected defaultSelect = `
    id,
    tenant_id,
    member_id,
    status_code,
    status_label,
    assigned_to,
    assigned_to_member_id,
    follow_up_at,
    closed_at,
    priority,
    details,
    membership_stage_id,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'membership_stage',
      foreignKey: 'membership_stage_id',
      select: ['id', 'name', 'code']
    }
  ];

  protected override async onBeforeCreate(
    data: Partial<MemberCarePlan>
  ): Promise<Partial<MemberCarePlan>> {
    if (data.is_active === undefined) data.is_active = true;
    return data;
  }

  protected override async onAfterCreate(data: MemberCarePlan): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_care_plans', data.id, data);
  }

  protected override async onAfterUpdate(data: MemberCarePlan): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_care_plans', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_care_plans', id, { id });
  }

  /**
   * Get all care plans for the current tenant (non-deleted)
   */
  async getAll(): Promise<MemberCarePlan[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find care plans: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data as unknown as MemberCarePlan[];
  }

  /**
   * Get all care plans with member and assigned caregiver information
   * Used by GraphQL resolvers to return complete care plan data
   */
  async getAllWithMembers(): Promise<MemberCarePlan[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const selectWithMembers = `
      ${this.defaultSelect},
      member:members!member_id(
        id,
        first_name,
        last_name,
        middle_name,
        preferred_name,
        email,
        contact_number,
        profile_picture_url
      ),
      assigned_to_member:members!assigned_to_member_id(
        id,
        first_name,
        last_name,
        email,
        contact_number
      )
    `;

    const { data, error } = await supabase
      .from(this.tableName)
      .select(selectWithMembers)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find care plans with members: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data as unknown as MemberCarePlan[];
  }

  /**
   * Get a care plan by ID within the current tenant (tenant-scoped)
   */
  async getById(carePlanId: string): Promise<MemberCarePlan | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', carePlanId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find care plan by ID: ${error.message}`);
    }

    return data as MemberCarePlan | null;
  }

  /**
   * Get all care plans for a specific member within the current tenant
   */
  async getByMember(memberId: string): Promise<MemberCarePlan[]> {
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
      throw new Error(`Failed to find care plans by member: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data as unknown as MemberCarePlan[];
  }
}
