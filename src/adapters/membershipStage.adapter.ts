import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MembershipStage } from '@/models/membershipStage.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMembershipStageAdapter = IBaseAdapter<MembershipStage>;

@injectable()
export class MembershipStageAdapter
  extends BaseAdapter<MembershipStage>
  implements IMembershipStageAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'membership_stage';

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
    data: Partial<MembershipStage>
  ): Promise<Partial<MembershipStage>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }

  protected override async onAfterCreate(data: MembershipStage): Promise<void> {
    await this.auditService.logAuditEvent('create', 'membership_stage', data.id, data);
  }

  protected override async onAfterUpdate(data: MembershipStage): Promise<void> {
    await this.auditService.logAuditEvent('update', 'membership_stage', data.id, data);
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
      throw new Error('Cannot delete membership stage with existing members');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'membership_stage', id, { id });
  }
}
