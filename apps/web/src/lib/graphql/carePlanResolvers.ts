/**
 * GraphQL Resolvers for Care Plan Queries and Mutations
 *
 * Implements efficient database queries with caching for care plans
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MemberCarePlanService } from '@/services/MemberCarePlanService';
import type { IMemberRepository } from '@/repositories/member.repository';
import { carePlanCache } from './carePlanCache';
import { tenantUtils } from '@/utils/tenantUtils';
import { MemberCarePlan } from '@/models/memberCarePlan.model';
import type { Member } from '@/models/member.model';

export interface SearchCarePlansArgs {
  searchTerm?: string;
  status?: string;
  priority?: string;
  assignedToMemberId?: string;
  upcomingFollowUps?: boolean;
  limit?: number;
}

export interface GetCarePlanArgs {
  id: string;
}

export interface GetMemberCarePlansArgs {
  memberId: string;
}

export interface CreateCarePlanInput {
  member_id: string;
  status_code: string;
  status_label?: string;
  priority?: string;
  assigned_to_member_id?: string;
  follow_up_at?: string;
  details?: string;
  membership_stage_id?: string;
  is_active?: boolean;
}

export interface UpdateCarePlanInput {
  status_code?: string;
  status_label?: string;
  priority?: string;
  assigned_to_member_id?: string;
  follow_up_at?: string;
  details?: string;
  membership_stage_id?: string;
  is_active?: boolean;
}

/**
 * Helper function to get all care plans with caching
 * Fetches care plans and enriches them with decrypted member data
 */
async function getAllCarePlans(): Promise<MemberCarePlan[]> {
  const tenantId = await tenantUtils.getTenantId();

  if (!tenantId) {
    throw new Error('No tenant context available');
  }

  // Check cache first
  const cached = carePlanCache.get(tenantId);
  if (cached) {
    return cached;
  }

  // Fetch care plans from database
  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
  const carePlans = await carePlanService.getCarePlansForTenant();

  // Fetch and decrypt member data for each care plan
  const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);

  // Get unique member IDs (both member_id and assigned_to_member_id)
  const memberIds = new Set<string>();
  carePlans.forEach(cp => {
    if (cp.member_id) memberIds.add(cp.member_id);
    if (cp.assigned_to_member_id) memberIds.add(cp.assigned_to_member_id);
  });

  // Fetch all members in one go (this will decrypt them)
  const memberPromises = Array.from(memberIds).map(id => memberRepo.findById(id));
  const members = await Promise.all(memberPromises);

  // Create a map of member_id -> member for quick lookup
  const memberMap = new Map<string, Member>();
  members.forEach((member: Member | null, index: number) => {
    if (member) {
      memberMap.set(Array.from(memberIds)[index], member);
    }
  });

  // Enrich care plans with member data
  const enrichedCarePlans = carePlans.map(cp => ({
    ...cp,
    member: cp.member_id ? (memberMap.get(cp.member_id) || null) : null,
    assigned_to_member: cp.assigned_to_member_id ? (memberMap.get(cp.assigned_to_member_id) || null) : null,
  }));

  // Cache the enriched results
  carePlanCache.set(tenantId, enrichedCarePlans);

  return enrichedCarePlans;
}

export const carePlanResolvers = {
  Query: {
    /**
     * Search care plans with caching optimization
     */
    searchCarePlans: async (_: any, args: SearchCarePlansArgs) => {
      const { searchTerm, status, priority, assignedToMemberId, upcomingFollowUps, limit = 50 } = args;

      console.log(`[GraphQL] searchCarePlans: term="${searchTerm}", status=${status}, priority=${priority}, assignedTo=${assignedToMemberId}, upcoming=${upcomingFollowUps}, limit=${limit}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      // Get care plans (with caching)
      let carePlans = await getAllCarePlans();

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase().trim();
        // Search in member name (if available) or details
        carePlans = carePlans.filter(cp =>
          cp.details?.toLowerCase().includes(searchLower) ||
          cp.status_label?.toLowerCase().includes(searchLower)
        );
      }

      // Apply status filter
      if (status) {
        carePlans = carePlans.filter(cp => cp.status_code === status);
      }

      // Apply priority filter
      if (priority) {
        carePlans = carePlans.filter(cp => cp.priority === priority);
      }

      // Apply assigned user filter
      if (assignedToMemberId) {
        carePlans = carePlans.filter(cp => cp.assigned_to_member_id === assignedToMemberId);
      }

      // Apply upcoming follow-ups filter
      if (upcomingFollowUps) {
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        carePlans = carePlans.filter(cp => {
          if (!cp.follow_up_at) return false;
          const followUpDate = new Date(cp.follow_up_at);
          return followUpDate >= now && followUpDate <= sevenDaysLater;
        });
      }

      // Apply limit
      carePlans = carePlans.slice(0, limit);

      console.log(`[GraphQL] searchCarePlans: found ${carePlans.length} care plans`);

      return carePlans;
    },

    /**
     * Get a specific care plan by ID
     */
    getCarePlan: async (_: any, args: GetCarePlanArgs) => {
      const { id } = args;

      console.log(`[GraphQL] getCarePlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
      const carePlan = await carePlanService.getCarePlanById(id);

      if (!carePlan) {
        console.log(`[GraphQL] getCarePlan: not found`);
        return null;
      }

      console.log(`[GraphQL] getCarePlan: found`);

      return carePlan;
    },

    /**
     * Get all care plans for a specific member
     */
    getMemberCarePlans: async (_: any, args: GetMemberCarePlansArgs) => {
      const { memberId } = args;

      console.log(`[GraphQL] getMemberCarePlans: memberId=${memberId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
      const carePlans = await carePlanService.getCarePlansByMember(memberId);

      console.log(`[GraphQL] getMemberCarePlans: found ${carePlans.length} care plans`);

      return carePlans;
    },

    /**
     * Get care plan statistics
     */
    getCarePlanStats: async () => {
      console.log(`[GraphQL] getCarePlanStats`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
      const stats = await carePlanService.getCarePlanStats();

      console.log(`[GraphQL] getCarePlanStats: retrieved statistics`);

      return stats;
    },
  },

  Mutation: {
    /**
     * Create a new care plan
     */
    createCarePlan: async (_: any, { input }: { input: CreateCarePlanInput }) => {
      console.log(`[GraphQL] createCarePlan: memberId="${input.member_id}", status="${input.status_code}"`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
      const carePlan = await carePlanService.createCarePlan({
        ...input,
        tenant_id: tenantId,
      });

      // Invalidate cache
      carePlanCache.invalidate(tenantId);

      console.log(`[GraphQL] createCarePlan: created care plan ${carePlan.id}`);

      return carePlan;
    },

    /**
     * Update an existing care plan
     */
    updateCarePlan: async (_: any, { id, input }: { id: string; input: UpdateCarePlanInput }) => {
      console.log(`[GraphQL] updateCarePlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
      const carePlan = await carePlanService.update(id, input);

      // Invalidate cache
      carePlanCache.invalidate(tenantId);

      console.log(`[GraphQL] updateCarePlan: updated care plan ${id}`);

      return carePlan;
    },

    /**
     * Close a care plan
     */
    closeCarePlan: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] closeCarePlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
      const carePlan = await carePlanService.closeCarePlan(id);

      // Invalidate cache
      carePlanCache.invalidate(tenantId);

      console.log(`[GraphQL] closeCarePlan: closed care plan ${id}`);

      return carePlan;
    },

    /**
     * Reopen a closed care plan
     */
    reopenCarePlan: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] reopenCarePlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
      const carePlan = await carePlanService.reopenCarePlan(id);

      // Invalidate cache
      carePlanCache.invalidate(tenantId);

      console.log(`[GraphQL] reopenCarePlan: reopened care plan ${id}`);

      return carePlan;
    },

    /**
     * Delete a care plan (soft delete)
     */
    deleteCarePlan: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] deleteCarePlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
      await carePlanService.delete(id);

      // Invalidate cache
      carePlanCache.invalidate(tenantId);

      console.log(`[GraphQL] deleteCarePlan: deleted care plan ${id}`);

      return true;
    },
  },
};
