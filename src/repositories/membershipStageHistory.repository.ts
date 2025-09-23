import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { MembershipStageHistory } from '@/models/membershipStageHistory.model';
import { TYPES } from '@/lib/types';

export type IMembershipStageHistoryRepository = BaseRepository<MembershipStageHistory>;

@injectable()
export class MembershipStageHistoryRepository
  extends BaseRepository<MembershipStageHistory>
  implements IMembershipStageHistoryRepository
{
  constructor(
    @inject(TYPES.IMembershipStageHistoryAdapter)
    adapter: BaseAdapter<MembershipStageHistory>,
  ) {
    super(adapter);
  }
}
