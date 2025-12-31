import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { MembershipStage } from '@/models/membershipStage.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IMembershipStageAdapter } from '@/adapters/membershipStage.adapter';

export type IMembershipStageRepository = BaseRepository<MembershipStage>;

@injectable()
export class MembershipStageRepository
  extends BaseRepository<MembershipStage>
  implements IMembershipStageRepository
{
  constructor(@inject(TYPES.IMembershipStageAdapter) adapter: IMembershipStageAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<MembershipStage>
  ): Promise<Partial<MembershipStage>> {
    return this.formatData(data);
  }

  protected override async afterCreate(data: MembershipStage): Promise<void> {
    NotificationService.showSuccess(`Membership stage "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<MembershipStage>
  ): Promise<Partial<MembershipStage>> {
    return this.formatData(data);
  }

  protected override async afterUpdate(data: MembershipStage): Promise<void> {
    NotificationService.showSuccess(`Membership stage "${data.name}" updated successfully`);
  }

  private formatData(data: Partial<MembershipStage>): Partial<MembershipStage> {
    return {
      ...data,
      code: data.code?.trim() || '',
      name: data.name?.trim() || '',
    };
  }
}
