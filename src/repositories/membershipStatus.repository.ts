import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { MembershipStatus } from '../models/membershipStatus.model';
import type { IMembershipStatusAdapter } from '../adapters/membershipStatus.adapter';
import { NotificationService } from '../services/NotificationService';

export type IMembershipStatusRepository = BaseRepository<MembershipStatus>;

@injectable()
export class MembershipStatusRepository
  extends BaseRepository<MembershipStatus>
  implements IMembershipStatusRepository
{
  constructor(@inject('IMembershipStatusAdapter') adapter: BaseAdapter<MembershipStatus>) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<MembershipStatus>
  ): Promise<Partial<MembershipStatus>> {
    return this.formatData(data);
  }

  protected override async afterCreate(data: MembershipStatus): Promise<void> {
    NotificationService.showSuccess(`Membership Status "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<MembershipStatus>
  ): Promise<Partial<MembershipStatus>> {
    return this.formatData(data);
  }

  protected override async afterUpdate(data: MembershipStatus): Promise<void> {
    NotificationService.showSuccess(`Membership Status "${data.name}" updated successfully`);
  }

  private formatData(data: Partial<MembershipStatus>): Partial<MembershipStatus> {
    return {
      ...data,
      code: data.code?.trim() || '',
      name: data.name?.trim() || '',
    };
  }
}
