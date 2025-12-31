/**
 * ================================================================================
 * MEMBER DISCIPLESHIP MILESTONE SERVICE
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
 *   const service = container.get<MemberDiscipleshipMilestoneService>(TYPES.MemberDiscipleshipMilestoneService);
 *   const milestones = await service.getMilestonesForPlan(planId);
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMemberDiscipleshipMilestoneRepository } from '@/repositories/memberDiscipleshipMilestone.repository';
import type { MemberDiscipleshipMilestone } from '@/models/memberDiscipleshipMilestone.model';

@injectable()
export class MemberDiscipleshipMilestoneService {
  constructor(
    @inject(TYPES.IMemberDiscipleshipMilestoneRepository)
    private repo: IMemberDiscipleshipMilestoneRepository,
  ) {}

  // ==================== QUERIES ====================

  /**
   * Get all milestones for a specific discipleship plan
   */
  async getMilestonesForPlan(planId: string): Promise<MemberDiscipleshipMilestone[]> {
    const result = await this.repo.findAll();
    const all = result.data;
    return all
      .filter((m: MemberDiscipleshipMilestone) => m.plan_id === planId)
      .sort((a: MemberDiscipleshipMilestone, b: MemberDiscipleshipMilestone) => {
        const dateA = a.milestone_date ? new Date(a.milestone_date).getTime() : 0;
        const dateB = b.milestone_date ? new Date(b.milestone_date).getTime() : 0;
        return dateA - dateB;
      });
  }

  /**
   * Get all milestones for a specific member
   */
  async getMilestonesForMember(memberId: string): Promise<MemberDiscipleshipMilestone[]> {
    const result = await this.repo.findAll();
    const all = result.data;
    return all
      .filter((m: MemberDiscipleshipMilestone) => m.member_id === memberId)
      .sort((a: MemberDiscipleshipMilestone, b: MemberDiscipleshipMilestone) => {
        const dateA = a.milestone_date ? new Date(a.milestone_date).getTime() : 0;
        const dateB = b.milestone_date ? new Date(b.milestone_date).getTime() : 0;
        return dateA - dateB;
      });
  }

  /**
   * Get a specific milestone by ID
   */
  async getMilestoneById(milestoneId: string): Promise<MemberDiscipleshipMilestone | null> {
    return this.repo.findById(milestoneId);
  }

  /**
   * Get recent milestones for the tenant (for dashboard/timeline)
   */
  async getRecentMilestones(limit = 10): Promise<Array<{
    id: string;
    memberId: string;
    planId: string | null;
    name: string;
    description: string | null;
    milestoneDate: string | null;
    celebratedAt: string | null;
    createdAt: string | null;
  }>> {
    const result = await this.repo.findAll();
    const all = result.data;

    return all
      .sort((a: MemberDiscipleshipMilestone, b: MemberDiscipleshipMilestone) => {
        const dateA = a.milestone_date ? new Date(a.milestone_date).getTime() : 0;
        const dateB = b.milestone_date ? new Date(b.milestone_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit)
      .map((m: MemberDiscipleshipMilestone) => ({
        id: m.id,
        memberId: m.member_id,
        planId: m.plan_id || null,
        name: m.name,
        description: m.description || null,
        milestoneDate: m.milestone_date || null,
        celebratedAt: m.celebrated_at || null,
        createdAt: m.created_at || null,
      }));
  }

  /**
   * Get celebrated milestones (milestones that have been marked as celebrated)
   */
  async getCelebratedMilestones(memberId?: string): Promise<MemberDiscipleshipMilestone[]> {
    const result = await this.repo.findAll();
    const all = result.data;
    return all
      .filter((m: MemberDiscipleshipMilestone) => m.celebrated_at && (!memberId || m.member_id === memberId))
      .sort((a: MemberDiscipleshipMilestone, b: MemberDiscipleshipMilestone) => {
        const dateA = a.celebrated_at ? new Date(a.celebrated_at).getTime() : 0;
        const dateB = b.celebrated_at ? new Date(b.celebrated_at).getTime() : 0;
        return dateB - dateA;
      });
  }

  /**
   * Get upcoming milestones (milestones with future dates)
   */
  async getUpcomingMilestones(memberId?: string): Promise<MemberDiscipleshipMilestone[]> {
    const result = await this.repo.findAll();
    const all = result.data;
    const now = new Date();

    return all
      .filter((m: MemberDiscipleshipMilestone) => {
        if (!m.milestone_date) return false;
        const milestoneDate = new Date(m.milestone_date);
        return milestoneDate >= now && (!memberId || m.member_id === memberId);
      })
      .sort((a: MemberDiscipleshipMilestone, b: MemberDiscipleshipMilestone) => {
        const dateA = a.milestone_date ? new Date(a.milestone_date).getTime() : 0;
        const dateB = b.milestone_date ? new Date(b.milestone_date).getTime() : 0;
        return dateA - dateB;
      });
  }

  // ==================== MUTATIONS ====================

  /**
   * Create a new milestone
   */
  async createMilestone(data: Partial<MemberDiscipleshipMilestone>): Promise<MemberDiscipleshipMilestone> {
    if (!data.member_id) {
      throw new Error('Member ID is required to create a milestone');
    }
    if (!data.name) {
      throw new Error('Milestone name is required');
    }

    return this.repo.create(data);
  }

  /**
   * Update an existing milestone
   */
  async updateMilestone(
    id: string,
    data: Partial<MemberDiscipleshipMilestone>
  ): Promise<MemberDiscipleshipMilestone> {
    return this.repo.update(id, data);
  }

  /**
   * Celebrate a milestone (mark as celebrated)
   */
  async celebrateMilestone(id: string, notes?: string): Promise<MemberDiscipleshipMilestone> {
    return this.repo.update(id, {
      celebrated_at: new Date().toISOString(),
      notes: notes || undefined,
    });
  }

  /**
   * Delete a milestone (soft delete)
   */
  async deleteMilestone(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  // ==================== STATISTICS ====================

  /**
   * Get milestone statistics for a member
   */
  async getMilestoneStats(memberId: string): Promise<{
    total: number;
    celebrated: number;
    upcoming: number;
    byPlan: Record<string, number>;
  }> {
    const milestones = await this.getMilestonesForMember(memberId);
    const now = new Date();

    const stats = {
      total: milestones.length,
      celebrated: 0,
      upcoming: 0,
      byPlan: {} as Record<string, number>,
    };

    for (const milestone of milestones) {
      if (milestone.celebrated_at) {
        stats.celebrated++;
      }

      if (milestone.milestone_date) {
        const milestoneDate = new Date(milestone.milestone_date);
        if (milestoneDate >= now && !milestone.celebrated_at) {
          stats.upcoming++;
        }
      }

      const planId = milestone.plan_id || 'no_plan';
      stats.byPlan[planId] = (stats.byPlan[planId] || 0) + 1;
    }

    return stats;
  }
}
