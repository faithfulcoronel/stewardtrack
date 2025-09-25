import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Message } from '@/models/message.model';
import { TYPES } from '@/lib/types';
import type { IMessageAdapter } from '@/adapters/message.adapter';

export type IMessageRepository = BaseRepository<Message>;

@injectable()
export class MessageRepository
  extends BaseRepository<Message>
  implements IMessageRepository
{
  constructor(@inject(TYPES.IMessageAdapter) adapter: IMessageAdapter) {
    super(adapter);
  }
}
