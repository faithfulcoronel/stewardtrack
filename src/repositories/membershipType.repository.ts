import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { MembershipType } from '@/models/membershipType.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IMembershipTypeAdapter } from '@/adapters/membershipType.adapter';

export type IMembershipTypeRepository = BaseRepository<MembershipType>;

@injectable()
export class MembershipTypeRepository
  extends BaseRepository<MembershipType>
  implements IMembershipTypeRepository
{
  constructor(@inject(TYPES.IMembershipTypeAdapter) adapter: IMembershipTypeAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<MembershipType>
  ): Promise<Partial<MembershipType>> {
    return this.formatData(data);
  }

  protected override async afterCreate(data: MembershipType): Promise<void> {
    NotificationService.showSuccess(`Membership Type "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<MembershipType>
  ): Promise<Partial<MembershipType>> {
    return this.formatData(data);
  }

  protected override async afterUpdate(data: MembershipType): Promise<void> {
    NotificationService.showSuccess(`Membership Type "${data.name}" updated successfully`);
  }

  private formatData(data: Partial<MembershipType>): Partial<MembershipType> {
    return {
      ...data,
      code: data.code?.trim() || '',
      name: data.name?.trim() || '',
    };
  }
}
