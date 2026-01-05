import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Family } from '@/models/family.model';
import type { IFamilyAdapter } from '@/adapters/family.adapter';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export interface IFamilyRepository extends BaseRepository<Family> {
  findByIdAndTenant(familyId: string, tenantId: string): Promise<Family | null>;
  findByTenant(tenantId: string): Promise<Family[]>;
  findByTenantWithMemberSummary(tenantId: string): Promise<Family[]>;
  searchByName(tenantId: string, searchTerm: string): Promise<Family[]>;
  findWithMembers(familyId: string, tenantId: string): Promise<Family | null>;
}

@injectable()
export class FamilyRepository extends BaseRepository<Family> implements IFamilyRepository {
  constructor(
    @inject(TYPES.IFamilyAdapter)
    private readonly familyAdapter: IFamilyAdapter
  ) {
    super(familyAdapter);
  }

  protected override async afterCreate(data: Family): Promise<void> {
    NotificationService.showSuccess(`Family "${data.name}" created successfully`);
  }

  protected override async afterUpdate(data: Family): Promise<void> {
    NotificationService.showSuccess(`Family "${data.name}" updated successfully`);
  }

  protected override async afterDelete(_id: string): Promise<void> {
    NotificationService.showSuccess('Family deleted successfully');
  }

  async findByIdAndTenant(familyId: string, tenantId: string): Promise<Family | null> {
    return this.familyAdapter.findByIdAndTenant(familyId, tenantId);
  }

  async findByTenant(tenantId: string): Promise<Family[]> {
    return this.familyAdapter.findByTenant(tenantId);
  }

  async findByTenantWithMemberSummary(tenantId: string): Promise<Family[]> {
    return this.familyAdapter.findByTenantWithMemberSummary(tenantId);
  }

  async searchByName(tenantId: string, searchTerm: string): Promise<Family[]> {
    return this.familyAdapter.searchByName(tenantId, searchTerm);
  }

  async findWithMembers(familyId: string, tenantId: string): Promise<Family | null> {
    return this.familyAdapter.findWithMembers(familyId, tenantId);
  }
}
