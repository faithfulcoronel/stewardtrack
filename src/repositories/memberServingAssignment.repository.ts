import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { MemberServingAssignment } from '@/models/memberServingAssignment.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export type IMemberServingAssignmentRepository = BaseRepository<MemberServingAssignment>;

@injectable()
export class MemberServingAssignmentRepository
  extends BaseRepository<MemberServingAssignment>
  implements IMemberServingAssignmentRepository
{
  constructor(@inject(TYPES.IMemberServingAssignmentAdapter) adapter: BaseAdapter<MemberServingAssignment>) {
    super(adapter);
  }

  protected override async afterCreate(_data: MemberServingAssignment): Promise<void> {
    NotificationService.showSuccess('Serving assignment created successfully.');
  }

  protected override async afterUpdate(_data: MemberServingAssignment): Promise<void> {
    NotificationService.showSuccess('Serving assignment updated successfully.');
  }
}
