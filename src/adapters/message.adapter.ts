import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { Message } from '@/models/message.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IMessageAdapter = IBaseAdapter<Message>;

@injectable()
export class MessageAdapter
  extends BaseAdapter<Message>
  implements IMessageAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'messages';

  protected defaultSelect = `
    id,
    thread_id,
    tenant_id,
    sender_id,
    body,
    attachments,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  protected override async onAfterCreate(data: Message): Promise<void> {
    await this.auditService.logAuditEvent('create', 'message', data.id, data);
  }

  protected override async onAfterUpdate(data: Message): Promise<void> {
    await this.auditService.logAuditEvent('update', 'message', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'message', id, { id });
  }
}
