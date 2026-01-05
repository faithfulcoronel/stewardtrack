import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFamilyRepository } from '@/repositories/family.repository';
import type { IFamilyMemberRepository } from '@/repositories/familyMember.repository';
import type { Family } from '@/models/family.model';
import type { FamilyMember, FamilyRole } from '@/models/familyMember.model';

export interface CreateFamilyWithMembersInput {
  familyData: Partial<Family>;
  members?: Array<{
    memberId: string;
    role: FamilyRole;
    isPrimary?: boolean;
    roleNotes?: string;
  }>;
}

@injectable()
export class FamilyService {
  constructor(
    @inject(TYPES.IFamilyRepository)
    private familyRepo: IFamilyRepository,
    @inject(TYPES.IFamilyMemberRepository)
    private familyMemberRepo: IFamilyMemberRepository
  ) {}

  // ============================================================================
  // Family CRUD Operations
  // ============================================================================

  /**
   * Get a family by ID
   */
  async getFamilyById(id: string): Promise<Family | null> {
    return this.familyRepo.findById(id);
  }

  /**
   * Get a family by ID and tenant (tenant-scoped query)
   */
  async getFamilyByIdAndTenant(familyId: string, tenantId: string): Promise<Family | null> {
    return this.familyRepo.findByIdAndTenant(familyId, tenantId);
  }

  /**
   * Get a family with all its members
   */
  async getFamilyWithMembers(familyId: string, tenantId: string): Promise<Family | null> {
    return this.familyRepo.findWithMembers(familyId, tenantId);
  }

  /**
   * Get all families for a tenant
   */
  async getFamiliesByTenant(tenantId: string): Promise<Family[]> {
    return this.familyRepo.findByTenant(tenantId);
  }

  /**
   * Get all families for a tenant with member summary (count and head info)
   */
  async getFamiliesWithMemberSummary(tenantId: string): Promise<Family[]> {
    return this.familyRepo.findByTenantWithMemberSummary(tenantId);
  }

  /**
   * Search families by name
   */
  async searchFamilies(tenantId: string, searchTerm: string): Promise<Family[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return this.familyRepo.findByTenant(tenantId);
    }
    return this.familyRepo.searchByName(tenantId, searchTerm.trim());
  }

  /**
   * Create a new family
   */
  async createFamily(data: Partial<Family>): Promise<Family> {
    return this.familyRepo.create(data);
  }

  /**
   * Update an existing family
   */
  async updateFamily(id: string, data: Partial<Family>): Promise<Family> {
    return this.familyRepo.update(id, data);
  }

  /**
   * Soft delete a family
   */
  async deleteFamily(id: string): Promise<void> {
    await this.familyRepo.delete(id);
  }

  /**
   * List families with pagination
   */
  async listFamilies(
    tenantId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: Family[]; total: number }> {
    const result = await this.familyRepo.find({
      filters: { tenant_id: { operator: 'eq', value: tenantId } },
      pagination: { page, pageSize },
    });
    return { data: result.data, total: result.count || result.data.length };
  }

  // ============================================================================
  // Family Membership Operations
  // ============================================================================

  /**
   * Add a member to a family
   */
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
    return this.familyMemberRepo.addMemberToFamily(familyId, memberId, tenantId, options);
  }

  /**
   * Remove a member from a family
   */
  async removeMemberFromFamily(
    familyId: string,
    memberId: string,
    tenantId: string
  ): Promise<void> {
    await this.familyMemberRepo.removeMemberFromFamily(familyId, memberId, tenantId);
  }

  /**
   * Update a member's role within a family
   */
  async updateMemberRole(
    familyId: string,
    memberId: string,
    tenantId: string,
    role: FamilyRole,
    roleNotes?: string
  ): Promise<FamilyMember> {
    return this.familyMemberRepo.updateMemberRole(familyId, memberId, tenantId, role, roleNotes);
  }

  /**
   * Set a member's primary family
   * The database trigger will automatically demote any existing primary
   */
  async setPrimaryFamily(memberId: string, familyId: string, tenantId: string): Promise<void> {
    await this.familyMemberRepo.setPrimaryFamily(memberId, familyId, tenantId);
  }

  /**
   * Get all families a member belongs to
   */
  async getMemberFamilies(memberId: string, tenantId: string): Promise<FamilyMember[]> {
    return this.familyMemberRepo.findByMember(memberId, tenantId);
  }

  /**
   * Get a member's primary family
   */
  async getPrimaryFamily(memberId: string, tenantId: string): Promise<FamilyMember | null> {
    return this.familyMemberRepo.findPrimaryFamily(memberId, tenantId);
  }

  /**
   * Get all members of a family
   */
  async getFamilyMembers(familyId: string, tenantId: string): Promise<FamilyMember[]> {
    return this.familyMemberRepo.findByFamily(familyId, tenantId);
  }

  /**
   * Get the head of a family
   */
  async getFamilyHead(familyId: string, tenantId: string): Promise<FamilyMember | null> {
    const members = await this.familyMemberRepo.findByFamily(familyId, tenantId);
    return members.find((m) => m.role === 'head') || null;
  }

  /**
   * Check if a member belongs to a specific family
   */
  async isMemberInFamily(
    familyId: string,
    memberId: string,
    tenantId: string
  ): Promise<boolean> {
    const result = await this.familyMemberRepo.findByFamilyAndMember(
      familyId,
      memberId,
      tenantId
    );
    return result !== null;
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Create a family with members in one operation
   */
  async createFamilyWithMembers(
    input: CreateFamilyWithMembersInput,
    createdBy?: string
  ): Promise<Family> {
    // Create the family first
    const family = await this.familyRepo.create(input.familyData);

    // Add members if provided
    if (input.members && input.members.length > 0) {
      const tenantId = input.familyData.tenant_id!;

      for (const memberInput of input.members) {
        await this.familyMemberRepo.addMemberToFamily(
          family.id!,
          memberInput.memberId,
          tenantId,
          {
            isPrimary: memberInput.isPrimary ?? false,
            role: memberInput.role,
            roleNotes: memberInput.roleNotes,
            createdBy,
          }
        );
      }
    }

    // Return the family with members
    if (input.familyData.tenant_id) {
      const result = await this.familyRepo.findWithMembers(family.id!, input.familyData.tenant_id);
      if (result) {
        return result;
      }
    }

    return family;
  }

  /**
   * Update family members in bulk
   * Adds new members, updates existing, removes those not in the list
   */
  async syncFamilyMembers(
    familyId: string,
    tenantId: string,
    members: Array<{
      memberId: string;
      role: FamilyRole;
      isPrimary?: boolean;
      roleNotes?: string;
    }>,
    updatedBy?: string
  ): Promise<FamilyMember[]> {
    // Get current members
    const currentMembers = await this.familyMemberRepo.findByFamily(familyId, tenantId);
    const currentMemberIds = new Set(currentMembers.map((m) => m.member_id));
    const newMemberIds = new Set(members.map((m) => m.memberId));

    // Remove members not in the new list
    for (const current of currentMembers) {
      if (!newMemberIds.has(current.member_id)) {
        await this.familyMemberRepo.removeMemberFromFamily(familyId, current.member_id, tenantId);
      }
    }

    // Add or update members
    for (const memberInput of members) {
      if (currentMemberIds.has(memberInput.memberId)) {
        // Update existing member's role
        await this.familyMemberRepo.updateMemberRole(
          familyId,
          memberInput.memberId,
          tenantId,
          memberInput.role,
          memberInput.roleNotes
        );
        // Update primary status if needed
        if (memberInput.isPrimary) {
          await this.familyMemberRepo.setPrimaryFamily(memberInput.memberId, familyId, tenantId);
        }
      } else {
        // Add new member
        await this.familyMemberRepo.addMemberToFamily(familyId, memberInput.memberId, tenantId, {
          isPrimary: memberInput.isPrimary ?? false,
          role: memberInput.role,
          roleNotes: memberInput.roleNotes,
          createdBy: updatedBy,
        });
      }
    }

    // Return updated member list
    return this.familyMemberRepo.findByFamily(familyId, tenantId);
  }
}

export type { Family, FamilyMember, FamilyRole };
