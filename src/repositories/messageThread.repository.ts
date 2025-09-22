import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { MessageThread } from '../models/messageThread.model';
import type { IMessageThreadAdapter } from '../adapters/messageThread.adapter';
import { TYPES } from '../lib/types';

export type IMessageThreadRepository = BaseRepository<MessageThread>;

@injectable()
export class MessageThreadRepository
  extends BaseRepository<MessageThread>
  implements IMessageThreadRepository
{
  constructor(@inject(TYPES.IMessageThreadAdapter) adapter: BaseAdapter<MessageThread>) {
    super(adapter);
  }
}
