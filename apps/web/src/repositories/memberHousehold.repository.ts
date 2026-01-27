import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { MemberHousehold } from '@/models/memberHousehold.model';
import type { IMemberHouseholdAdapter } from '@/adapters/memberHousehold.adapter';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

/**
 * MemberHouseholdRepository Interface
 *
 * Data access contract for household records.
 *
 * ## Permission Requirements (Feature: members.household)
 *
 * | Operation | Required Permission |
 * |-----------|---------------------|
 * | Read operations | `households:view` |
 * | Create operations | `households:manage` |
 * | Update operations | `households:manage` |
 * | Delete operations | `households:delete` |
 */
export interface IMemberHouseholdRepository extends BaseRepository<MemberHousehold> {
  /** @permission households:view */
  findByIdAndTenant(householdId: string, tenantId: string): Promise<MemberHousehold | null>;
  /** @permission households:view */
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
