/**
 * ================================================================================
 * MEMBER DISCIPLESHIP PLAN SERVICE
 * ================================================================================
 *
 * SERVICE PATTERN:
 * Services contain business logic and orchestrate operations across repositories.
 * They are the primary interface for feature functionality.
 *
 * KEY RESPONSIBILITIES:
 *   1. Implement business logic (filtering, aggregation, validation)
 *   2. Coordinate multiple repository operations
 *   3. Enforce business rules
 *   4. Provide domain-oriented API for consumers (handlers, API routes)
 *
 * DEPENDENCY INJECTION:
 * Services use InversifyJS decorators for dependency injection.
 * Bind services in src/lib/container.ts with .inRequestScope() for multi-tenancy.
 *
 * USAGE IN METADATA HANDLERS:
 *   const service = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
 *   const plans = await service.getPlansForTenant();
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMemberDiscipleshipPlanRepository } from '@/repositories/memberDiscipleshipPlan.repository';
import type { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';

@injectable()
export class MemberDiscipleshipPlanService {
  constructor(
    @inject(TYPES.IMemberDiscipleshipPlanRepository)
    private repo: IMemberDiscipleshipPlanRepository,
  ) {}

  // ==================== TENANT-SCOPED QUERIES ====================

  /**
   * Get all discipleship plans for the current tenant
   */
  async getPlansForTenant(): Promise<MemberDiscipleshipPlan[]> {
    return this.repo.getAll();
  }

  /**
   * Get a specific discipleship plan by ID (tenant-scoped)
   */
  async getPlanById(planId: string): Promise<MemberDiscipleshipPlan | null> {
    return this.repo.getById(planId);
  }

  /**
   * Get all discipleship plans for a specific member
   */
  async getPlansByMember(memberId: string): Promise<MemberDiscipleshipPlan[]> {
    return this.repo.getByMember(memberId);
  }

  // ==================== FILTERED QUERIES ====================

  /**
   * Get active discipleship plans for the tenant
   * Active = status is 'active' or null/undefined (default)
   */
  async getActivePlansForTenant(): Promise<MemberDiscipleshipPlan[]> {
    const plans = await this.repo.getAll();
    return plans
      .filter((plan: MemberDiscipleshipPlan) => !plan.status || plan.status === 'active')
      .sort((a: MemberDiscipleshipPlan, b: MemberDiscipleshipPlan) => {
        // Sort by created_at descending
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }

  /**
   * Get discipleship plans by pathway
   */
  async getPlansByPathway(pathway: string): Promise<MemberDiscipleshipPlan[]> {
    const plans = await this.repo.getAll();
    return plans
      .filter((plan: MemberDiscipleshipPlan) => plan.pathway === pathway)
      .sort((a: MemberDiscipleshipPlan, b: MemberDiscipleshipPlan) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }

  /**
   * Get discipleship plans by mentor
   */
  async getPlansByMentor(mentorName: string): Promise<MemberDiscipleshipPlan[]> {
    const plans = await this.repo.getAll();
    return plans
      .filter((plan: MemberDiscipleshipPlan) => plan.mentor_name === mentorName)
      .sort((a: MemberDiscipleshipPlan, b: MemberDiscipleshipPlan) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }

  /**
   * Get completed discipleship plans for the tenant
   */
  async getCompletedPlansForTenant(): Promise<MemberDiscipleshipPlan[]> {
    const plans = await this.repo.getAll();
    return plans
      .filter((plan: MemberDiscipleshipPlan) => plan.status === 'completed')
      .sort((a: MemberDiscipleshipPlan, b: MemberDiscipleshipPlan) => {
        // Sort by updated_at descending (when status was changed)
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      });
  }

  // ==================== MUTATIONS ====================

  /**
   * Create a new discipleship plan
   */
  async createPlan(data: Partial<MemberDiscipleshipPlan>): Promise<MemberDiscipleshipPlan> {
    // Set defaults if not provided
    const planData: Partial<MemberDiscipleshipPlan> = {
      ...data,
      status: data.status || 'active',
    };

    return this.repo.create(planData);
  }

  /**
   * Update an existing discipleship plan
   */
  async updatePlan(
    id: string,
    data: Partial<MemberDiscipleshipPlan>
  ): Promise<MemberDiscipleshipPlan> {
    return this.repo.update(id, data);
  }

  /**
   * Mark a discipleship plan as completed
   */
  async completePlan(id: string): Promise<MemberDiscipleshipPlan> {
    return this.repo.update(id, {
      status: 'completed',
    });
  }

  /**
   * Reopen a completed discipleship plan
   */
  async reopenPlan(id: string): Promise<MemberDiscipleshipPlan> {
    return this.repo.update(id, {
      status: 'active',
    });
  }

  /**
   * Soft delete a discipleship plan
   */
  async deletePlan(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  // ==================== STATISTICS ====================

  /**
   * Get discipleship plan statistics for the dashboard
   */
  async getPlanStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    byPathway: Record<string, number>;
  }> {
    const plans = await this.repo.getAll();

    const stats = {
      total: plans.length,
      active: 0,
      completed: 0,
      byPathway: {} as Record<string, number>,
    };

    for (const plan of plans) {
      if (plan.status === 'completed') {
        stats.completed++;
      } else {
        stats.active++;
      }

      // Count by pathway
      const pathway = plan.pathway || 'other';
      stats.byPathway[pathway] = (stats.byPathway[pathway] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get recent discipleship plans (for timeline/dashboard)
   */
  async getRecentPlans(limit = 5): Promise<Array<{
    id: string;
    memberId: string;
    pathway: string | null;
    nextStep: string | null;
    mentorName: string | null;
    status: string | null;
    targetDate: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>> {
    const plans = await this.repo.getAll();

    return plans
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit)
      .map((plan) => ({
        id: plan.id,
        memberId: plan.member_id,
        pathway: plan.pathway || null,
        nextStep: plan.next_step || null,
        mentorName: plan.mentor_name || null,
        status: plan.status || null,
        targetDate: plan.target_date || null,
        createdAt: plan.created_at || null,
        updatedAt: plan.updated_at || null,
      }));
  }
}
