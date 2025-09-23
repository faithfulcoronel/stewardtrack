import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type IMemberDiscipleshipPlanRepository = BaseRepository<MemberDiscipleshipPlan>;

@injectable()
export class MemberDiscipleshipPlanRepository
  extends BaseRepository<MemberDiscipleshipPlan>
  implements IMemberDiscipleshipPlanRepository
{
  constructor(
    @inject(TYPES.IMemberDiscipleshipPlanAdapter)
    adapter: BaseAdapter<MemberDiscipleshipPlan>,
  ) {
    super(adapter);
  }

  protected override async afterCreate(_data: MemberDiscipleshipPlan): Promise<void> {
    NotificationService.showSuccess('Discipleship plan created successfully.');
  }

  protected override async afterUpdate(_data: MemberDiscipleshipPlan): Promise<void> {
    NotificationService.showSuccess('Discipleship plan updated successfully.');
  }
}
