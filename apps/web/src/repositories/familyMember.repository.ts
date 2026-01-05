import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { FamilyMember, FamilyRole } from '@/models/familyMember.model';
import type { IFamilyMemberAdapter } from '@/adapters/familyMember.adapter';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';

export interface IFamilyMemberRepository extends BaseRepository<FamilyMember> {
  findByFamily(familyId: string, tenantId: string): Promise<FamilyMember[]>;
  findByMember(memberId: string, tenantId: string): Promise<FamilyMember[]>;
  findPrimaryFamily(memberId: string, tenantId: string): Promise<FamilyMember | null>;
  findByFamilyAndMember(
    familyId: string,
    memberId: string,
    tenantId: string
  ): Promise<FamilyMember | null>;
  addMemberToFamily(
    familyId: string,
    memberId: string,
    tenantId: string,
    options: {
      isPrimary?: boolean;
      role?: FamilyRole;
      roleNotes?: string;
      createdBy?: string;
    }
  ): Promise<FamilyMember>;
  removeMemberFromFamily(familyId: string, memberId: string, tenantId: string): Promise<void>;
  updateMemberRole(
    familyId: string,
    memberId: string,
    tenantId: string,
    role: FamilyRole,
    roleNotes?: string
  ): Promise<FamilyMember>;
  setPrimaryFamily(memberId: string, familyId: string, tenantId: string): Promise<void>;
}

@injectable()
export class FamilyMemberRepository
  extends BaseRepository<FamilyMember>
  implements IFamilyMemberRepository
{
  constructor(
    @inject(TYPES.IFamilyMemberAdapter)
    private readonly familyMemberAdapter: IFamilyMemberAdapter
  ) {
    super(familyMemberAdapter);
  }

  protected override async afterCreate(_data: FamilyMember): Promise<void> {
    NotificationService.showSuccess('Member added to family successfully');
  }

  protected override async afterUpdate(_data: FamilyMember): Promise<void> {
    NotificationService.showSuccess('Family member updated successfully');
  }

  protected override async afterDelete(_id: string): Promise<void> {
    NotificationService.showSuccess('Member removed from family');
  }

  async findByFamily(familyId: string, tenantId: string): Promise<FamilyMember[]> {
    return this.familyMemberAdapter.findByFamily(familyId, tenantId);
  }

  async findByMember(memberId: string, tenantId: string): Promise<FamilyMember[]> {
    return this.familyMemberAdapter.findByMember(memberId, tenantId);
  }

  async findPrimaryFamily(memberId: string, tenantId: string): Promise<FamilyMember | null> {
    return this.familyMemberAdapter.findPrimaryFamily(memberId, tenantId);
  }

  async findByFamilyAndMember(
    familyId: string,
    memberId: string,
    tenantId: string
  ): Promise<FamilyMember | null> {
    return this.familyMemberAdapter.findByFamilyAndMember(familyId, memberId, tenantId);
  }

  async addMemberToFamily(
    familyId: string,
    memberId: string,
    tenantId: string,
    options: {
      isPrimary?: boolean;
      role?: FamilyRole;
      roleNotes?: string;
      createdBy?: string;
    } = {}
  ): Promise<FamilyMember> {
    const result = await this.familyMemberAdapter.addMemberToFamily(
      familyId,
      memberId,
      tenantId,
      options
    );
    await this.afterCreate(result);
    return result;
  }

  async removeMemberFromFamily(
    familyId: string,
    memberId: string,
    tenantId: string
  ): Promise<void> {
    await this.familyMemberAdapter.removeMemberFromFamily(familyId, memberId, tenantId);
    await this.afterDelete(`${familyId}-${memberId}`);
  }

  async updateMemberRole(
    familyId: string,
    memberId: string,
    tenantId: string,
    role: FamilyRole,
    roleNotes?: string
  ): Promise<FamilyMember> {
    const result = await this.familyMemberAdapter.updateMemberRole(
      familyId,
      memberId,
      tenantId,
      role,
      roleNotes
    );
    await this.afterUpdate(result);
    return result;
  }

  async setPrimaryFamily(memberId: string, familyId: string, tenantId: string): Promise<void> {
    await this.familyMemberAdapter.setPrimaryFamily(memberId, familyId, tenantId);
    NotificationService.showSuccess('Primary family updated');
  }
}
