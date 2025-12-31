import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MemberDiscipleshipMilestone } from '@/models/memberDiscipleshipMilestone.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMemberDiscipleshipMilestoneAdapter = IBaseAdapter<MemberDiscipleshipMilestone>;

@injectable()
export class MemberDiscipleshipMilestoneAdapter
  extends BaseAdapter<MemberDiscipleshipMilestone>
  implements IMemberDiscipleshipMilestoneAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'member_discipleship_milestones';

  protected defaultSelect = `
    id,
    member_id,
    plan_id,
    name,
    description,
    milestone_date,
    celebrated_at,
    notes,
    created_at,
    created_by
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'member_discipleship_plans',
      foreignKey: 'plan_id',
      select: ['id', 'pathway', 'next_step']
    }
  ];

  protected override async onAfterCreate(data: MemberDiscipleshipMilestone): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_discipleship_milestones', data.id, data);
  }

  protected override async onAfterUpdate(data: MemberDiscipleshipMilestone): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_discipleship_milestones', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_discipleship_milestones', id, { id });
  }
}
