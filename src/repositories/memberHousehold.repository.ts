import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { MemberHousehold } from '@/models/memberHousehold.model';
import type { IMemberHouseholdAdapter } from '@/adapters/memberHousehold.adapter';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export interface IMemberHouseholdRepository extends BaseRepository<MemberHousehold> {
  findByIdAndTenant(householdId: string, tenantId: string): Promise<MemberHousehold | null>;
  findByTenant(tenantId: string): Promise<MemberHousehold[]>;
}

@injectable()
export class MemberHouseholdRepository
  extends BaseRepository<MemberHousehold>
  implements IMemberHouseholdRepository
{
  constructor(
    @inject(TYPES.IMemberHouseholdAdapter)
    private readonly memberHouseholdAdapter: IMemberHouseholdAdapter
  ) {
    super(memberHouseholdAdapter);
  }

  protected override async afterCreate(data: MemberHousehold): Promise<void> {
    NotificationService.showSuccess(`Household "${data.name || 'Unnamed'}" created successfully`);
  }

  protected override async afterUpdate(data: MemberHousehold): Promise<void> {
    NotificationService.showSuccess(`Household "${data.name || 'Unnamed'}" updated successfully`);
  }

  protected override async afterDelete(id: string): Promise<void> {
    NotificationService.showSuccess('Household deleted successfully');
  }

  async findByIdAndTenant(householdId: string, tenantId: string): Promise<MemberHousehold | null> {
    return this.memberHouseholdAdapter.findByIdAndTenant(householdId, tenantId);
  }

  async findByTenant(tenantId: string): Promise<MemberHousehold[]> {
    return this.memberHouseholdAdapter.findByTenant(tenantId);
  }
}
