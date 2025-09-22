import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MembershipStatus } from '@/models/membershipStatus.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMembershipStatusAdapter = IBaseAdapter<MembershipStatus>;

@injectable()
export class MembershipStatusAdapter
  extends BaseAdapter<MembershipStatus>
  implements IMembershipStatusAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'membership_status';

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
    data: Partial<MembershipStatus>
  ): Promise<Partial<MembershipStatus>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }

  protected override async onAfterCreate(data: MembershipStatus): Promise<void> {
    await this.auditService.logAuditEvent('create', 'membership_status', data.id, data);
  }

  protected override async onAfterUpdate(data: MembershipStatus): Promise<void> {
    await this.auditService.logAuditEvent('update', 'membership_status', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: members, error } = await supabase
      .from('members')
      .select('id')
      .eq('membership_status_id', id)
      .limit(1);
    if (error) throw error;
    if (members?.length) {
      throw new Error('Cannot delete membership status with existing members');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'membership_status', id, { id });
  }
}
