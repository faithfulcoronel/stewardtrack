import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { MemberGivingProfile } from '@/models/memberGivingProfile.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMemberGivingProfileAdapter = IBaseAdapter<MemberGivingProfile>;

@injectable()
export class MemberGivingProfileAdapter
  extends BaseAdapter<MemberGivingProfile>
  implements IMemberGivingProfileAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'member_giving_profiles';

  protected defaultSelect = `
    id,
    member_id,
    recurring_amount,
    recurring_frequency,
    recurring_method,
    recurring_status,
    pledge_amount,
    pledge_campaign,
    pledge_start_date,
    pledge_end_date,
    ytd_amount,
    ytd_year,
    last_gift_amount,
    last_gift_at,
    last_gift_fund,
    last_gift_source,
    data_source,
    created_at,
    updated_at,
    created_by,
    updated_by
  `;

  protected override async onAfterCreate(data: MemberGivingProfile): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_giving_profiles', data.id, data);
  }

  protected override async onAfterUpdate(data: MemberGivingProfile): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_giving_profiles', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_giving_profiles', id, { id });
  }
}
