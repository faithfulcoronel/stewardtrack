import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { MemberTimelineEvent } from '@/models/memberTimelineEvent.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMemberTimelineEventAdapter = IBaseAdapter<MemberTimelineEvent>;

@injectable()
export class MemberTimelineEventAdapter
  extends BaseAdapter<MemberTimelineEvent>
  implements IMemberTimelineEventAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'member_timeline_events';

  protected defaultSelect = `
    id,
    member_id,
    title,
    description,
    event_type,
    event_category,
    status,
    icon,
    occurred_at,
    recorded_at,
    metadata,
    created_at,
    updated_at,
    created_by,
    updated_by
  `;

  protected override async onAfterCreate(data: MemberTimelineEvent): Promise<void> {
    await this.auditService.logAuditEvent('create', 'member_timeline_events', data.id, data);
  }

  protected override async onAfterUpdate(data: MemberTimelineEvent): Promise<void> {
    await this.auditService.logAuditEvent('update', 'member_timeline_events', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'member_timeline_events', id, { id });
  }
}
