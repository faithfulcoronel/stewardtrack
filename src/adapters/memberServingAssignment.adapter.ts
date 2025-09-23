import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { MemberServingAssignment } from '@/models/memberServingAssignment.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMemberServingAssignmentAdapter = IBaseAdapter<MemberServingAssignment>;

@injectable()
export class MemberServingAssignmentAdapter
  extends BaseAdapter<MemberServingAssignment>
  implements IMemberServingAssignmentAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'member_serving_assignments';

  protected defaultSelect = `
    id,
    member_id,
    team_name,
    role_name,
    schedule,
    coach_name,
    status,
    start_on,
    end_on,
    is_primary,
    notes,
    created_at,
    updated_at,
    created_by,
    updated_by
  `;

  protected override async onBeforeCreate(
    data: Partial<MemberServingAssignment>
  ): Promise<Partial<MemberServingAssignment>> {
    if (data.is_primary === undefined) data.is_primary = true;
    return data;
  }

  protected override async onAfterCreate(data: MemberServingAssignment): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_serving_assignments', data.id, data);
  }

  protected override async onAfterUpdate(data: MemberServingAssignment): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_serving_assignments', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_serving_assignments', id, { id });
  }
}
