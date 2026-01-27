import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { MemberCarePlan } from '@/models/memberCarePlan.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IMemberCarePlanAdapter } from '@/adapters/memberCarePlan.adapter';

/**
 * Repository interface for member care plan data access.
 *
 * @module members.care
 *
 * @permission careplans:view - Required for read operations (getAll, getById, getByMember)
 * @permission careplans:manage - Required for create/update operations
 * @permission careplans:delete - Required for delete operations
 */
export interface IMemberCarePlanRepository extends BaseRepository<MemberCarePlan> {
  getAll(): Promise<MemberCarePlan[]>;
  getAllWithMembers(): Promise<MemberCarePlan[]>;
  getById(carePlanId: string): Promise<MemberCarePlan | null>;
  getByMember(memberId: string): Promise<MemberCarePlan[]>;
}

/**
 * Repository implementation for member care plans.
 *
 * @module members.care
 *
 * @permission careplans:view - Required for read operations
 * @permission careplans:manage - Required for create/update operations
 * @permission careplans:delete - Required for delete operations
 */
@injectable()
export class MemberCarePlanRepository
  extends BaseRepository<MemberCarePlan>
  implements IMemberCarePlanRepository
{
  constructor(
    @inject(TYPES.IMemberCarePlanAdapter)
    private readonly memberCarePlanAdapter: IMemberCarePlanAdapter
  ) {
    super(memberCarePlanAdapter);
  }

  protected override async afterCreate(_data: MemberCarePlan): Promise<void> {
    NotificationService.showSuccess(`Care plan created for member.`);
  }

  protected override async afterUpdate(_data: MemberCarePlan): Promise<void> {
    NotificationService.showSuccess(`Care plan updated successfully.`);
  }

  async getAll(): Promise<MemberCarePlan[]> {
    return this.memberCarePlanAdapter.getAll();
  }

  async getAllWithMembers(): Promise<MemberCarePlan[]> {
    return this.memberCarePlanAdapter.getAllWithMembers();
  }

  async getById(carePlanId: string): Promise<MemberCarePlan | null> {
    return this.memberCarePlanAdapter.getById(carePlanId);
  }

  async getByMember(memberId: string): Promise<MemberCarePlan[]> {
    return this.memberCarePlanAdapter.getByMember(memberId);
  }
}
