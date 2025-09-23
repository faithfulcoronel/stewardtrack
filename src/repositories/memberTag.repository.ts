import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { MemberTag } from '@/models/memberTag.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type IMemberTagRepository = BaseRepository<MemberTag>;

@injectable()
export class MemberTagRepository
  extends BaseRepository<MemberTag>
  implements IMemberTagRepository
{
  constructor(@inject(TYPES.IMemberTagAdapter) adapter: BaseAdapter<MemberTag>) {
    super(adapter);
  }

  protected override async afterCreate(_data: MemberTag): Promise<void> {
    NotificationService.showSuccess('Member tag added successfully.');
  }

  protected override async afterUpdate(_data: MemberTag): Promise<void> {
    NotificationService.showSuccess('Member tag updated successfully.');
  }
}
