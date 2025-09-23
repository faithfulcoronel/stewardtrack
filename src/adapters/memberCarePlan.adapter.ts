import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MemberCarePlan } from '@/models/memberCarePlan.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMemberCarePlanAdapter = IBaseAdapter<MemberCarePlan>;

@injectable()
export class MemberCarePlanAdapter
  extends BaseAdapter<MemberCarePlan>
  implements IMemberCarePlanAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'member_care_plans';

  protected defaultSelect = `
    id,
    member_id,
    status_code,
    status_label,
    assigned_to,
    follow_up_at,
    closed_at,
    priority,
    details,
    membership_stage_id,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by
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
}
