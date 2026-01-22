/**
 * GraphQL Resolvers for Discipleship Plan Queries and Mutations
 *
 * Implements efficient database queries with caching for discipleship plans
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MemberDiscipleshipPlanService } from '@/services/MemberDiscipleshipPlanService';
import type { MemberDiscipleshipMilestoneService } from '@/services/MemberDiscipleshipMilestoneService';
import type { DiscipleshipPathwayService } from '@/services/DiscipleshipPathwayService';
import type { IMemberRepository } from '@/repositories/member.repository';
import { discipleshipPlanCache } from './discipleshipPlanCache';
import { tenantUtils } from '@/utils/tenantUtils';
import { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';
import type { Member } from '@/models/member.model';

export interface SearchDiscipleshipPlansArgs {
  searchTerm?: string;
  status?: string;
  pathwayId?: string; // Note: Used for pathway name filtering in schema, not ID
  mentorId?: string; // Note: Used for mentor name filtering in schema, not ID
  limit?: number;
}

export interface GetDiscipleshipPlanArgs {
  id: string;
}

export interface GetMemberDiscipleshipPlansArgs {
  memberId: string;
}

export interface GetDiscipleshipPathwayArgs {
  id: string;
}

export interface CreateDiscipleshipPlanInput {
  member_id: string;
  pathway_id: string; // Maps to pathway field in database
  mentor_id?: string; // Maps to mentor_name field in database
  start_date: string; // Note: Actual model doesn't have this, using target_date
  target_completion_date?: string; // Maps to target_date
  notes?: string;
}

export interface UpdateDiscipleshipPlanInput {
  mentor_id?: string; // Maps to mentor_name field in database
  status?: string;
  target_completion_date?: string; // Maps to target_date
  actual_completion_date?: string; // Note: Actual model doesn't have this field
  notes?: string;
  is_active?: boolean; // Note: Actual model doesn't have this field
}

export interface CelebrateMilestoneArgs {
  planId: string;
  milestoneId: string;
}

/**
 * Helper function to get all discipleship plans with caching
 * Fetches plans and enriches them with decrypted member data
 */
async function getAllDiscipleshipPlans(): Promise<MemberDiscipleshipPlan[]> {
  const tenantId = await tenantUtils.getTenantId();

  if (!tenantId) {
    throw new Error('No tenant context available');
  }

  // Check cache first
  const cached = discipleshipPlanCache.get(tenantId);
  if (cached) {
    return cached;
  }

  // Fetch discipleship plans from database
  const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
  const plans = await planService.getPlansForTenant();

  // Fetch and decrypt member data for each plan
  const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);

  // Get unique member IDs (both member_id and mentor_id if it's a member ID)
  const memberIds = new Set<string>();
  plans.forEach(plan => {
    if (plan.member_id) memberIds.add(plan.member_id);
    // Note: mentor_id might not be a member_id in the database, could be just a name string
    // We'll handle mentor separately if needed
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

  // Enrich plans with member data
  const enrichedPlans = plans.map(plan => ({
    ...plan,
    member: plan.member_id ? (memberMap.get(plan.member_id) || null) : null,
    // Note: mentor might need separate lookup if mentor_id is a member ID
    mentor: null, // Will be populated if mentor_id is a member ID
  }));

  // Cache the enriched results
  discipleshipPlanCache.set(tenantId, enrichedPlans);

  return enrichedPlans;
}

export const discipleshipPlanResolvers = {
  Query: {
    /**
     * Search discipleship plans with caching optimization
     */
    searchDiscipleshipPlans: async (_: any, args: SearchDiscipleshipPlansArgs) => {
      const { searchTerm, status, pathwayId, mentorId, limit = 50 } = args;

      console.log(`[GraphQL] searchDiscipleshipPlans: term="${searchTerm}", status=${status}, pathway=${pathwayId}, mentor=${mentorId}, limit=${limit}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      // Get discipleship plans (with caching)
      let plans = await getAllDiscipleshipPlans();

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase().trim();
        plans = plans.filter(plan =>
          plan.notes?.toLowerCase().includes(searchLower) ||
          plan.pathway?.toLowerCase().includes(searchLower) ||
          plan.mentor_name?.toLowerCase().includes(searchLower)
        );
      }

      // Apply status filter
      if (status) {
        plans = plans.filter(plan => plan.status === status);
      }

      // Apply pathway filter (pathwayId is actually the pathway name)
      if (pathwayId) {
        plans = plans.filter(plan => plan.pathway === pathwayId);
      }

      // Apply mentor filter (mentorId is actually the mentor name)
      if (mentorId) {
        plans = plans.filter(plan => plan.mentor_name === mentorId);
      }

      // Apply limit
      plans = plans.slice(0, limit);

      console.log(`[GraphQL] searchDiscipleshipPlans: found ${plans.length} plans`);

      return plans;
    },

    /**
     * Get a specific discipleship plan by ID
     */
    getDiscipleshipPlan: async (_: any, args: GetDiscipleshipPlanArgs) => {
      const { id } = args;

      console.log(`[GraphQL] getDiscipleshipPlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
      const plan = await planService.getPlanById(id);

      if (!plan) {
        console.log(`[GraphQL] getDiscipleshipPlan: not found`);
        return null;
      }

      // Decrypt member data
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
      const member = plan.member_id ? await memberRepo.findById(plan.member_id) : null;

      console.log(`[GraphQL] getDiscipleshipPlan: found`);

      return {
        ...plan,
        member,
      };
    },

    /**
     * Get all discipleship plans for a specific member
     */
    getMemberDiscipleshipPlans: async (_: any, args: GetMemberDiscipleshipPlansArgs) => {
      const { memberId } = args;

      console.log(`[GraphQL] getMemberDiscipleshipPlans: memberId=${memberId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
      const plans = await planService.getPlansByMember(memberId);

      // Decrypt member data
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
      const member = memberId ? await memberRepo.findById(memberId) : null;

      const enrichedPlans = plans.map(plan => ({
        ...plan,
        member,
      }));

      console.log(`[GraphQL] getMemberDiscipleshipPlans: found ${plans.length} plans`);

      return enrichedPlans;
    },

    /**
     * Get all available discipleship pathways
     */
    getDiscipleshipPathways: async () => {
      console.log(`[GraphQL] getDiscipleshipPathways`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const pathwayService = container.get<DiscipleshipPathwayService>(TYPES.DiscipleshipPathwayService);
      const pathways = await pathwayService.getActive();

      console.log(`[GraphQL] getDiscipleshipPathways: found ${pathways.length} pathways`);

      return pathways;
    },

    /**
     * Get a specific discipleship pathway by ID
     */
    getDiscipleshipPathway: async (_: any, args: GetDiscipleshipPathwayArgs) => {
      const { id } = args;

      console.log(`[GraphQL] getDiscipleshipPathway: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const pathwayService = container.get<DiscipleshipPathwayService>(TYPES.DiscipleshipPathwayService);
      const pathway = await pathwayService.getById(id);

      if (!pathway) {
        console.log(`[GraphQL] getDiscipleshipPathway: not found`);
        return null;
      }

      console.log(`[GraphQL] getDiscipleshipPathway: found`);

      return pathway;
    },

    /**
     * Get discipleship plan statistics
     */
    getDiscipleshipPlanStats: async () => {
      console.log(`[GraphQL] getDiscipleshipPlanStats`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
      const stats = await planService.getPlanStats();

      // Transform stats to match GraphQL schema
      const pathwayStats = Object.entries(stats.byPathway || {}).map(([pathwayId, count]) => ({
        pathway_id: pathwayId,
        pathway_name: pathwayId, // You might want to fetch actual pathway names
        count,
      }));

      const statusStats = [
        { status: 'active', count: stats.active },
        { status: 'completed', count: stats.completed },
      ];

      // Calculate average completion percentage
      const allPlans = await getAllDiscipleshipPlans();
      let totalPercentage = 0;
      allPlans.forEach(plan => {
        // Calculate progress if milestones exist
        totalPercentage += 0; // Would need milestone data to calculate
      });
      const avgCompletion = allPlans.length > 0 ? totalPercentage / allPlans.length : 0;

      console.log(`[GraphQL] getDiscipleshipPlanStats: retrieved statistics`);

      return {
        total: stats.total,
        active: stats.active,
        completed: stats.completed,
        archived: 0, // Not tracked in current stats
        by_pathway: pathwayStats,
        by_status: statusStats,
        avg_completion_percentage: avgCompletion,
      };
    },
  },

  Mutation: {
    /**
     * Create a new discipleship plan
     */
    createDiscipleshipPlan: async (_: any, { input }: { input: CreateDiscipleshipPlanInput }) => {
      console.log(`[GraphQL] createDiscipleshipPlan: memberId="${input.member_id}", pathwayId="${input.pathway_id}"`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);

      // Map GraphQL input to database model
      const plan = await planService.createPlan({
        member_id: input.member_id,
        pathway: input.pathway_id, // Map pathway_id to pathway
        mentor_name: input.mentor_id, // Map mentor_id to mentor_name
        target_date: input.target_completion_date || input.start_date, // Map to target_date
        notes: input.notes,
        tenant_id: tenantId,
      });

      // Invalidate cache
      discipleshipPlanCache.invalidate(tenantId);

      // Decrypt member data
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
      const member = plan.member_id ? await memberRepo.findById(plan.member_id) : null;

      console.log(`[GraphQL] createDiscipleshipPlan: created plan ${plan.id}`);

      return {
        ...plan,
        member,
      };
    },

    /**
     * Update an existing discipleship plan
     */
    updateDiscipleshipPlan: async (_: any, { id, input }: { id: string; input: UpdateDiscipleshipPlanInput }) => {
      console.log(`[GraphQL] updateDiscipleshipPlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);

      // Map GraphQL input to database model
      const updateData: Partial<MemberDiscipleshipPlan> = {
        status: input.status,
        notes: input.notes,
      };

      if (input.mentor_id !== undefined) {
        updateData.mentor_name = input.mentor_id;
      }

      if (input.target_completion_date !== undefined) {
        updateData.target_date = input.target_completion_date;
      }

      const plan = await planService.updatePlan(id, updateData);

      // Invalidate cache
      discipleshipPlanCache.invalidate(tenantId);

      // Decrypt member data
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
      const member = plan.member_id ? await memberRepo.findById(plan.member_id) : null;

      console.log(`[GraphQL] updateDiscipleshipPlan: updated plan ${id}`);

      return {
        ...plan,
        member,
      };
    },

    /**
     * Complete a discipleship plan
     */
    completeDiscipleshipPlan: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] completeDiscipleshipPlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
      const plan = await planService.completePlan(id);

      // Invalidate cache
      discipleshipPlanCache.invalidate(tenantId);

      // Decrypt member data
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
      const member = plan.member_id ? await memberRepo.findById(plan.member_id) : null;

      console.log(`[GraphQL] completeDiscipleshipPlan: completed plan ${id}`);

      return {
        ...plan,
        member,
      };
    },

    /**
     * Archive a discipleship plan
     */
    archiveDiscipleshipPlan: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] archiveDiscipleshipPlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
      const plan = await planService.updatePlan(id, { status: 'archived' });

      // Invalidate cache
      discipleshipPlanCache.invalidate(tenantId);

      // Decrypt member data
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
      const member = plan.member_id ? await memberRepo.findById(plan.member_id) : null;

      console.log(`[GraphQL] archiveDiscipleshipPlan: archived plan ${id}`);

      return {
        ...plan,
        member,
      };
    },

    /**
     * Delete a discipleship plan (soft delete)
     */
    deleteDiscipleshipPlan: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] deleteDiscipleshipPlan: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const planService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
      await planService.deletePlan(id);

      // Invalidate cache
      discipleshipPlanCache.invalidate(tenantId);

      console.log(`[GraphQL] deleteDiscipleshipPlan: deleted plan ${id}`);

      return true;
    },

    /**
     * Celebrate a milestone for a discipleship plan
     */
    celebrateMilestone: async (_: any, { planId, milestoneId }: CelebrateMilestoneArgs) => {
      console.log(`[GraphQL] celebrateMilestone: planId=${planId}, milestoneId=${milestoneId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const milestoneService = container.get<MemberDiscipleshipMilestoneService>(TYPES.MemberDiscipleshipMilestoneService);
      const milestone = await milestoneService.celebrateMilestone(milestoneId);

      // Invalidate cache (milestone celebration might affect plan stats)
      discipleshipPlanCache.invalidate(tenantId);

      console.log(`[GraphQL] celebrateMilestone: celebrated milestone ${milestoneId}`);

      return milestone;
    },

    /**
     * Uncelebrate a milestone for a discipleship plan
     */
    uncelebrateMilestone: async (_: any, { milestoneId }: CelebrateMilestoneArgs) => {
      console.log(`[GraphQL] uncelebrateMilestone: milestoneId=${milestoneId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const milestoneService = container.get<MemberDiscipleshipMilestoneService>(TYPES.MemberDiscipleshipMilestoneService);
      const milestone = await milestoneService.updateMilestone(milestoneId, {
        celebrated_at: null,
      });

      // Invalidate cache
      discipleshipPlanCache.invalidate(tenantId);

      console.log(`[GraphQL] uncelebrateMilestone: uncelebrated milestone ${milestoneId}`);

      return milestone;
    },
  },
};
