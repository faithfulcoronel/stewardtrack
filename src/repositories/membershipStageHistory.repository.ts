import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { MembershipStageHistory } from '@/models/membershipStageHistory.model';
import { TYPES } from '@/lib/types';
import type { IMembershipStageHistoryAdapter } from '@/adapters/membershipStageHistory.adapter';

export type IMembershipStageHistoryRepository = BaseRepository<MembershipStageHistory>;

@injectable()
export class MembershipStageHistoryRepository
  extends BaseRepository<MembershipStageHistory>
  implements IMembershipStageHistoryRepository
{
  constructor(
    @inject(TYPES.IMembershipStageHistoryAdapter)
    adapter: IMembershipStageHistoryAdapter,
  ) {
    super(adapter);
  }
}
