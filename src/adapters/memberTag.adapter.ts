import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { MemberTag } from '@/models/memberTag.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMemberTagAdapter = IBaseAdapter<MemberTag>;

@injectable()
export class MemberTagAdapter
  extends BaseAdapter<MemberTag>
  implements IMemberTagAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'member_tags';

  protected defaultSelect = `
    id,
    member_id,
    tag,
    color,
    created_at,
    created_by
  `;

  protected override async onAfterCreate(data: MemberTag): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_tags', data.id, data);
  }

  protected override async onAfterUpdate(data: MemberTag): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_tags', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_tags', id, { id });
  }
}
