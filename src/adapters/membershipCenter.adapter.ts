import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MembershipCenter } from '@/models/membershipCenter.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMembershipCenterAdapter = IBaseAdapter<MembershipCenter>;

@injectable()
export class MembershipCenterAdapter
  extends BaseAdapter<MembershipCenter>
  implements IMembershipCenterAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'membership_center';

  protected defaultSelect = `
    id,
    code,
    name,
    description,
    address,
    service_times,
    is_system,
    is_active,
    is_primary,
    sort_order,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onBeforeCreate(
    data: Partial<MembershipCenter>
  ): Promise<Partial<MembershipCenter>> {
    if (data.is_active === undefined) data.is_active = true;
    if (data.is_primary === undefined) data.is_primary = false;
    if (data.is_system === undefined) data.is_system = false;
    if (data.sort_order === undefined) data.sort_order = 0;
    return data;
  }

  protected override async onAfterCreate(data: MembershipCenter): Promise<void> {
    await this.auditService.logAuditEvent('create', 'membership_center', data.id, data);
  }

  protected override async onAfterUpdate(data: MembershipCenter): Promise<void> {
    await this.auditService.logAuditEvent('update', 'membership_center', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'membership_center', id, { id });
  }
}
