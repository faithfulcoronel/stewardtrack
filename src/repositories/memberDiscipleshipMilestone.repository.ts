import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { MemberDiscipleshipMilestone } from '@/models/memberDiscipleshipMilestone.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type IMemberDiscipleshipMilestoneRepository = BaseRepository<MemberDiscipleshipMilestone>;

@injectable()
export class MemberDiscipleshipMilestoneRepository
  extends BaseRepository<MemberDiscipleshipMilestone>
  implements IMemberDiscipleshipMilestoneRepository
{
  constructor(
    @inject(TYPES.IMemberDiscipleshipMilestoneAdapter)
    adapter: BaseAdapter<MemberDiscipleshipMilestone>,
  ) {
    super(adapter);
  }

  protected override async afterCreate(_data: MemberDiscipleshipMilestone): Promise<void> {
    NotificationService.showSuccess('Discipleship milestone recorded successfully.');
  }

  protected override async afterUpdate(_data: MemberDiscipleshipMilestone): Promise<void> {
    NotificationService.showSuccess('Discipleship milestone updated successfully.');
  }
}
