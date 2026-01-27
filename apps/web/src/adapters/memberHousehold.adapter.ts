import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { MemberHousehold } from '@/models/memberHousehold.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * MemberHouseholdAdapter Interface
 *
 * Database adapter for household records in the member_households table.
 *
 * ## Permission Requirements (Feature: members.household)
 *
 * | Operation | Required Permission |
 * |-----------|---------------------|
 * | Read operations | `households:view` |
 * | Create operations | `households:manage` |
 * | Update operations | `households:manage` |
 * | Delete operations | `households:delete` |
 *
 * Permission checks are enforced at the service/API route level.
 */
export interface IMemberHouseholdAdapter extends IBaseAdapter<MemberHousehold> {
  /** @permission households:view */
  findByIdAndTenant(householdId: string, tenantId: string): Promise<MemberHousehold | null>;
  /** @permission households:view */
  findByTenant(tenantId: string): Promise<MemberHousehold[]>;
}

@injectable()
export class MemberHouseholdAdapter
  extends BaseAdapter<MemberHousehold>
  implements IMemberHouseholdAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'member_households';

  protected defaultSelect = `
    id,
    tenant_id,
    name,
    address_street,
    address_city,
    address_state,
    address_postal_code,
    member_names,
    notes,
    encrypted_fields,
    encryption_key_version,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  protected override async onAfterCreate(data: MemberHousehold): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_household', data.id!, data);
  }

  protected override async onAfterUpdate(data: MemberHousehold): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_household', data.id!, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_household', id, { id });
  }

  /**
   * Find a household by ID within a tenant (tenant-scoped)
   */
  async findByIdAndTenant(householdId: string, tenantId: string): Promise<MemberHousehold | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', householdId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find household by ID: ${error.message}`);
    }

    return data as MemberHousehold | null;
  }

  /**
   * Find all households for a tenant (non-deleted)
   */
  async findByTenant(tenantId: string): Promise<MemberHousehold[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to find households by tenant: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data as unknown as MemberHousehold[];
  }

}
