import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMemberDiscipleshipPlanAdapter = IBaseAdapter<MemberDiscipleshipPlan>;

@injectable()
export class MemberDiscipleshipPlanAdapter
  extends BaseAdapter<MemberDiscipleshipPlan>
  implements IMemberDiscipleshipPlanAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'member_discipleship_plans';

  protected defaultSelect = `
    id,
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
    updated_by
  `;

  protected override async onAfterCreate(data: MemberDiscipleshipPlan): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_discipleship_plans', data.id, data);
  }

  protected override async onAfterUpdate(data: MemberDiscipleshipPlan): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_discipleship_plans', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_discipleship_plans', id, { id });
  }
}
