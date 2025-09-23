import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { MemberTimelineEvent } from '@/models/memberTimelineEvent.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type IMemberTimelineEventRepository = BaseRepository<MemberTimelineEvent>;

@injectable()
export class MemberTimelineEventRepository
  extends BaseRepository<MemberTimelineEvent>
  implements IMemberTimelineEventRepository
{
  constructor(
    @inject(TYPES.IMemberTimelineEventAdapter)
    adapter: BaseAdapter<MemberTimelineEvent>,
  ) {
    super(adapter);
  }

  protected override async afterCreate(_data: MemberTimelineEvent): Promise<void> {
    NotificationService.showSuccess('Timeline event recorded successfully.');
  }

  protected override async afterUpdate(_data: MemberTimelineEvent): Promise<void> {
    NotificationService.showSuccess('Timeline event updated successfully.');
  }
}
