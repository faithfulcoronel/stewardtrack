import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { MemberHousehold } from '@/models/memberHousehold.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IMemberHouseholdAdapter extends IBaseAdapter<MemberHousehold> {
  findByIdAndTenant(householdId: string, tenantId: string): Promise<MemberHousehold | null>;
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

  /**
   * Override update method to use tenant_id from data payload
   * instead of relying on async local storage context
   */
  public override async update(
    id: string,
    data: Partial<MemberHousehold>,
    relations?: Record<string, string[]>,
    fieldsToRemove: string[] = []
  ): Promise<MemberHousehold> {
    try {
      // Get tenant_id from data payload
      const tenantId = (data as any).tenant_id;

      if (!tenantId) {
        throw new Error('No tenant_id found in household data');
      }

      // Run pre-update hook
      let processedData = await this.onBeforeUpdate(id, data);

      // Remove specified fields
      if (fieldsToRemove.length > 0) {
        const sanitizedData = { ...processedData } as Record<string, unknown>;
        fieldsToRemove.forEach((field) => {
          delete sanitizedData[field];
        });
        processedData = sanitizedData as Partial<MemberHousehold>;
      }

      // Update record
      const userId = await this.getUserId();
      const supabase = await this.getSupabaseClient();

      const { data: updated, error: updateError } = await supabase
        .from(this.tableName)
        .update({
          ...processedData,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select(this.defaultSelect)
        .single();

      if (updateError) {
        throw new Error(`Failed to update household: ${updateError.message}`);
      }

      if (!updated) {
        throw new Error('No data returned from update operation');
      }

      // Handle relations if provided
      if (relations && Object.keys(relations).length > 0) {
        // Note: If relations are needed, implement updateRelations method
        console.warn('Relations handling not implemented for MemberHouseholdAdapter.update');
      }

      const householdData = updated as unknown as MemberHousehold;

      // Run post-update hook
      await this.onAfterUpdate(householdData);

      return householdData;
    } catch (error: any) {
      throw new Error(`Failed to update household: ${error?.message || 'Unknown error'}`);
    }
  }
}
