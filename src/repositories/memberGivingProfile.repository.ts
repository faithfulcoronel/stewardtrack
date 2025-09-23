import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { MemberGivingProfile } from '@/models/memberGivingProfile.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type IMemberGivingProfileRepository = BaseRepository<MemberGivingProfile>;

@injectable()
export class MemberGivingProfileRepository
  extends BaseRepository<MemberGivingProfile>
  implements IMemberGivingProfileRepository
{
  constructor(
    @inject(TYPES.IMemberGivingProfileAdapter)
    adapter: BaseAdapter<MemberGivingProfile>,
  ) {
    super(adapter);
  }

  protected override async afterCreate(_data: MemberGivingProfile): Promise<void> {
    NotificationService.showSuccess('Giving profile created successfully.');
  }

  protected override async afterUpdate(_data: MemberGivingProfile): Promise<void> {
    NotificationService.showSuccess('Giving profile updated successfully.');
  }
}
