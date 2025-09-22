import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { Announcement } from '@/models/announcement.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IAnnouncementAdapter = IBaseAdapter<Announcement>;

@injectable()
export class AnnouncementAdapter
  extends BaseAdapter<Announcement>
  implements IAnnouncementAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'announcements';

  protected defaultSelect = `
    id,
    tenant_id,
    message,
    active,
    starts_at,
    ends_at,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected override async onAfterCreate(data: Announcement): Promise<void> {
    await this.auditService.logAuditEvent('create', 'announcement', data.id, data);
  }

  protected override async onAfterUpdate(data: Announcement): Promise<void> {
    await this.auditService.logAuditEvent('update', 'announcement', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'announcement', id, { id });
  }
}
