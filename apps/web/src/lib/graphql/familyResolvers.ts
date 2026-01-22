/**
 * GraphQL Resolvers for Family Queries and Mutations
 *
 * Implements efficient database queries with caching for families
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { FamilyService } from '@/services/FamilyService';
import { familyCache } from './familyCache';
import { tenantUtils } from '@/utils/tenantUtils';
import { Family } from '@/models/family.model';
import { FamilyMember } from '@/models/familyMember.model';

export interface SearchFamiliesArgs {
  searchTerm?: string;
  hasMembers?: boolean;
  limit?: number;
}

export interface GetFamilyArgs {
  id: string;
}

export interface GetFamilyMembersArgs {
  familyId: string;
}

export interface GetMemberFamiliesArgs {
  memberId: string;
}

export interface GetPrimaryFamilyArgs {
  memberId: string;
}

export interface CreateFamilyInput {
  name: string;
  formal_name?: string;
  address_street?: string;
  address_street2?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
  address_country?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateFamilyInput {
  name?: string;
  formal_name?: string;
  address_street?: string;
  address_street2?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
  address_country?: string;
  notes?: string;
  tags?: string[];
}

export interface AddMemberToFamilyInput {
  family_id: string;
  member_id: string;
  role: 'head' | 'spouse' | 'child' | 'dependent' | 'other';
  role_notes?: string;
  is_primary?: boolean;
}

export interface UpdateMemberRoleArgs {
  familyId: string;
  memberId: string;
  role: 'head' | 'spouse' | 'child' | 'dependent' | 'other';
}

export interface RemoveMemberFromFamilyArgs {
  familyId: string;
  memberId: string;
}

export interface SetPrimaryFamilyArgs {
  memberId: string;
  familyId: string;
}

/**
 * Helper function to get all families with caching
 */
async function getAllFamilies(): Promise<Family[]> {
  const tenantId = await tenantUtils.getTenantId();

  if (!tenantId) {
    throw new Error('No tenant context available');
  }

  // Check cache first
  const cached = familyCache.get(tenantId);
  if (cached) {
    return cached;
  }

  // Fetch from database if not cached
  const familyService = container.get<FamilyService>(TYPES.FamilyService);
  const result = await familyService.getFamiliesWithMemberSummary(tenantId);

  // Cache the results
  familyCache.set(tenantId, result.data);

  return result.data;
}

export const familyResolvers = {
  Query: {
    /**
     * Search families with caching optimization
     */
    searchFamilies: async (_: any, args: SearchFamiliesArgs) => {
      const { searchTerm, hasMembers, limit = 50 } = args;

      console.log(`[GraphQL] searchFamilies: term="${searchTerm}", hasMembers=${hasMembers}, limit=${limit}`);

      // Get all families (with caching)
      let families = await getAllFamilies();

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase().trim();
        families = families.filter(f => {
          const name = f.name?.toLowerCase() || '';
          const formalName = f.formal_name?.toLowerCase() || '';
          const address = `${f.address_street || ''} ${f.address_city || ''} ${f.address_state || ''}`.toLowerCase();

          return name.includes(searchLower) ||
                 formalName.includes(searchLower) ||
                 address.includes(searchLower);
        });
      }

      // Apply hasMembers filter
      if (hasMembers !== undefined) {
        families = families.filter(f => {
          const memberCount = f.member_count || 0;
          return hasMembers ? memberCount > 0 : memberCount === 0;
        });
      }

      // Apply limit
      families = families.slice(0, limit);

      console.log(`[GraphQL] searchFamilies: found ${families.length} families`);

      return families;
    },

    /**
     * Get a specific family by ID with all members
     */
    getFamily: async (_: any, args: GetFamilyArgs) => {
      const { id } = args;

      console.log(`[GraphQL] getFamily: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.getFamilyWithMembers(id, tenantId);

      if (!result.success || !result.data) {
        console.log(`[GraphQL] getFamily: not found`);
        return null;
      }

      console.log(`[GraphQL] getFamily: found with ${result.data.members?.length || 0} members`);

      return result.data;
    },

    /**
     * Get all members of a specific family
     */
    getFamilyMembers: async (_: any, args: GetFamilyMembersArgs) => {
      const { familyId } = args;

      console.log(`[GraphQL] getFamilyMembers: familyId=${familyId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.getFamilyMembers(familyId, tenantId);

      if (!result.success || !result.data) {
        return [];
      }

      console.log(`[GraphQL] getFamilyMembers: found ${result.data.length} members`);

      return result.data;
    },

    /**
     * Get all families that a member belongs to
     */
    getMemberFamilies: async (_: any, args: GetMemberFamiliesArgs) => {
      const { memberId } = args;

      console.log(`[GraphQL] getMemberFamilies: memberId=${memberId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.getMemberFamilies(memberId, tenantId);

      if (!result.success || !result.data) {
        return [];
      }

      console.log(`[GraphQL] getMemberFamilies: found ${result.data.length} families`);

      return result.data;
    },

    /**
     * Get a member's primary family
     */
    getPrimaryFamily: async (_: any, args: GetPrimaryFamilyArgs) => {
      const { memberId } = args;

      console.log(`[GraphQL] getPrimaryFamily: memberId=${memberId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.getPrimaryFamily(memberId, tenantId);

      if (!result.success || !result.data) {
        console.log(`[GraphQL] getPrimaryFamily: not found`);
        return null;
      }

      console.log(`[GraphQL] getPrimaryFamily: found`);

      return result.data;
    },
  },

  Mutation: {
    /**
     * Create a new family
     */
    createFamily: async (_: any, { input }: { input: CreateFamilyInput }) => {
      console.log(`[GraphQL] createFamily: name="${input.name}"`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.createFamily({
        ...input,
        tenant_id: tenantId,
      });

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to create family');
      }

      // Invalidate cache
      familyCache.invalidate(tenantId);

      console.log(`[GraphQL] createFamily: created family ${result.data.id}`);

      return result.data;
    },

    /**
     * Update an existing family
     */
    updateFamily: async (_: any, { id, input }: { id: string; input: UpdateFamilyInput }) => {
      console.log(`[GraphQL] updateFamily: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.updateFamily(id, tenantId, input);

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to update family');
      }

      // Invalidate cache
      familyCache.invalidate(tenantId);

      console.log(`[GraphQL] updateFamily: updated family ${id}`);

      return result.data;
    },

    /**
     * Add a member to a family with a specific role
     */
    addMemberToFamily: async (_: any, { input }: { input: AddMemberToFamilyInput }) => {
      console.log(`[GraphQL] addMemberToFamily: familyId=${input.family_id}, memberId=${input.member_id}, role=${input.role}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.addMemberToFamily(
        input.family_id,
        input.member_id,
        tenantId,
        {
          isPrimary: input.is_primary,
          role: input.role,
          roleNotes: input.role_notes,
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to add member to family');
      }

      // Invalidate cache
      familyCache.invalidate(tenantId);

      console.log(`[GraphQL] addMemberToFamily: added member ${input.member_id} to family ${input.family_id}`);

      return result.data;
    },

    /**
     * Remove a member from a family
     */
    removeMemberFromFamily: async (_: any, args: RemoveMemberFromFamilyArgs) => {
      const { familyId, memberId } = args;

      console.log(`[GraphQL] removeMemberFromFamily: familyId=${familyId}, memberId=${memberId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.removeMemberFromFamily(familyId, memberId, tenantId);

      if (!result.success) {
        throw new Error(result.message || 'Failed to remove member from family');
      }

      // Invalidate cache
      familyCache.invalidate(tenantId);

      console.log(`[GraphQL] removeMemberFromFamily: removed member ${memberId} from family ${familyId}`);

      return true;
    },

    /**
     * Update a member's role within a family
     */
    updateMemberRole: async (_: any, args: UpdateMemberRoleArgs) => {
      const { familyId, memberId, role } = args;

      console.log(`[GraphQL] updateMemberRole: familyId=${familyId}, memberId=${memberId}, role=${role}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.updateMemberRole(familyId, memberId, tenantId, role);

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to update member role');
      }

      // Invalidate cache
      familyCache.invalidate(tenantId);

      console.log(`[GraphQL] updateMemberRole: updated role for member ${memberId} in family ${familyId}`);

      return result.data;
    },

    /**
     * Set a family as a member's primary family
     */
    setPrimaryFamily: async (_: any, args: SetPrimaryFamilyArgs) => {
      const { memberId, familyId } = args;

      console.log(`[GraphQL] setPrimaryFamily: memberId=${memberId}, familyId=${familyId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const result = await familyService.setPrimaryFamily(memberId, familyId, tenantId);

      if (!result.success) {
        throw new Error(result.message || 'Failed to set primary family');
      }

      // Invalidate cache
      familyCache.invalidate(tenantId);

      console.log(`[GraphQL] setPrimaryFamily: set family ${familyId} as primary for member ${memberId}`);

      return true;
    },
  },
};
