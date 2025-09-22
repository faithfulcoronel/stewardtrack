import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MembershipType } from '@/models/membershipType.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMembershipTypeAdapter = IBaseAdapter<MembershipType>;

@injectable()
export class MembershipTypeAdapter
  extends BaseAdapter<MembershipType>
  implements IMembershipTypeAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'membership_type';

  protected defaultSelect = `
    id,
    code,
    name,
    description,
    is_system,
    is_active,
    sort_order,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onBeforeCreate(
    data: Partial<MembershipType>
  ): Promise<Partial<MembershipType>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }

  protected override async onAfterCreate(data: MembershipType): Promise<void> {
    await this.auditService.logAuditEvent('create', 'membership_type', data.id, data);
  }

  protected override async onAfterUpdate(data: MembershipType): Promise<void> {
    await this.auditService.logAuditEvent('update', 'membership_type', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: members, error } = await supabase
      .from('members')
      .select('id')
      .eq('membership_type_id', id)
      .limit(1);
    if (error) throw error;
    if (members?.length) {
      throw new Error('Cannot delete membership type with existing members');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'membership_type', id, { id });
  }
}
