import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { MessageThread } from '@/models/messageThread.model';
import { TYPES } from '@/lib/types';
import type { IMessageThreadAdapter } from '@/adapters/messageThread.adapter';

export type IMessageThreadRepository = BaseRepository<MessageThread>;

@injectable()
export class MessageThreadRepository
  extends BaseRepository<MessageThread>
  implements IMessageThreadRepository
{
  constructor(@inject(TYPES.IMessageThreadAdapter) adapter: IMessageThreadAdapter) {
    super(adapter);
  }
}
