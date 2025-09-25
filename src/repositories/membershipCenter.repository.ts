import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { MembershipCenter } from '@/models/membershipCenter.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IMembershipCenterAdapter } from '@/adapters/membershipCenter.adapter';

export type IMembershipCenterRepository = BaseRepository<MembershipCenter>;

@injectable()
export class MembershipCenterRepository
  extends BaseRepository<MembershipCenter>
  implements IMembershipCenterRepository
{
  constructor(@inject(TYPES.IMembershipCenterAdapter) adapter: IMembershipCenterAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<MembershipCenter>
  ): Promise<Partial<MembershipCenter>> {
    return this.normalizeData(data);
  }

  protected override async afterCreate(data: MembershipCenter): Promise<void> {
    NotificationService.showSuccess(`Membership center "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<MembershipCenter>
  ): Promise<Partial<MembershipCenter>> {
    return this.normalizeData(data);
  }

  protected override async afterUpdate(data: MembershipCenter): Promise<void> {
    NotificationService.showSuccess(`Membership center "${data.name}" updated successfully`);
  }

  private normalizeData(data: Partial<MembershipCenter>): Partial<MembershipCenter> {
    return {
      ...data,
      code: data.code?.trim() || '',
      name: data.name?.trim() || '',
    };
  }
}
