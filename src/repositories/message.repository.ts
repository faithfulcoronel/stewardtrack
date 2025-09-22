import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { Message } from '@/models/message.model';
import { TYPES } from '@/lib/types';

export type IMessageRepository = BaseRepository<Message>;

@injectable()
export class MessageRepository
  extends BaseRepository<Message>
  implements IMessageRepository
{
  constructor(@inject(TYPES.IMessageAdapter) adapter: BaseAdapter<Message>) {
    super(adapter);
  }
}
