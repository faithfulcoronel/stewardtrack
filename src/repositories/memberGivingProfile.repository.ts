import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { MemberGivingProfile } from '@/models/memberGivingProfile.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IMemberGivingProfileAdapter } from '@/adapters/memberGivingProfile.adapter';

export type IMemberGivingProfileRepository = BaseRepository<MemberGivingProfile>;

@injectable()
export class MemberGivingProfileRepository
  extends BaseRepository<MemberGivingProfile>
  implements IMemberGivingProfileRepository
{
  constructor(
    @inject(TYPES.IMemberGivingProfileAdapter)
    adapter: IMemberGivingProfileAdapter,
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
