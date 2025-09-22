import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { MessageThread } from '../models/messageThread.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type IMessageThreadAdapter = IBaseAdapter<MessageThread>;

@injectable()
export class MessageThreadAdapter
  extends BaseAdapter<MessageThread>
  implements IMessageThreadAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'message_threads';

  protected defaultSelect = `
    id,
    tenant_id,
    subject,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'messages',
      foreignKey: 'thread_id',
      select: [
        'id',
        'thread_id',
        'tenant_id',
        'sender_id',
        'body',
        'attachments',
        'created_at',
        'updated_at'
      ]
    }
  ];

  protected override async onAfterCreate(data: MessageThread): Promise<void> {
    await this.auditService.logAuditEvent('create', 'message_thread', data.id, data);
  }

  protected override async onAfterUpdate(data: MessageThread): Promise<void> {
    await this.auditService.logAuditEvent('update', 'message_thread', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'message_thread', id, { id });
  }
}
