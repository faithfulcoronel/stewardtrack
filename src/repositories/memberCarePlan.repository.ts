import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { MemberCarePlan } from '@/models/memberCarePlan.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IMemberCarePlanAdapter } from '@/adapters/memberCarePlan.adapter';

export type IMemberCarePlanRepository = BaseRepository<MemberCarePlan>;

@injectable()
export class MemberCarePlanRepository
  extends BaseRepository<MemberCarePlan>
  implements IMemberCarePlanRepository
{
  constructor(@inject(TYPES.IMemberCarePlanAdapter) adapter: IMemberCarePlanAdapter) {
    super(adapter);
  }

  protected override async afterCreate(_data: MemberCarePlan): Promise<void> {
    NotificationService.showSuccess(`Care plan created for member.`);
  }

  protected override async afterUpdate(_data: MemberCarePlan): Promise<void> {
    NotificationService.showSuccess(`Care plan updated successfully.`);
  }
}
