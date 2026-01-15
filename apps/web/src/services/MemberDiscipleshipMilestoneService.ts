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
import type { IMemberRepository } from '@/repositories/member.repository';
import type { IMemberDiscipleshipPlanRepository } from '@/repositories/memberDiscipleshipPlan.repository';
import type { MemberDiscipleshipMilestone } from '@/models/memberDiscipleshipMilestone.model';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import { NotificationEventType } from '@/models/notification/notificationEvent.model';
import { randomUUID } from 'crypto';

@injectable()
export class MemberDiscipleshipMilestoneService {
  constructor(
    @inject(TYPES.IMemberDiscipleshipMilestoneRepository)
    private repo: IMemberDiscipleshipMilestoneRepository,
    @inject(TYPES.IMemberRepository)
    private memberRepo: IMemberRepository,
    @inject(TYPES.IMemberDiscipleshipPlanRepository)
    private planRepo: IMemberDiscipleshipPlanRepository,
    @inject(TYPES.NotificationBusService)
    private notificationBus: INotificationBusService,
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
   * Sends celebration notifications to the member and mentor
   */
  async celebrateMilestone(id: string, notes?: string): Promise<MemberDiscipleshipMilestone> {
    const milestone = await this.repo.update(id, {
      celebrated_at: new Date().toISOString(),
      notes: notes || undefined,
    });

    // Send celebration notifications
    await this.sendMilestoneCelebrationNotifications(milestone, notes);

    return milestone;
  }

  /**
   * Send celebration notifications when a milestone is reached
   * Notifies both the member and the mentor
   */
  private async sendMilestoneCelebrationNotifications(
    milestone: MemberDiscipleshipMilestone,
    celebrationNotes?: string
  ): Promise<void> {
    await Promise.all([
      this.sendMilestoneNotificationToMember(milestone, celebrationNotes),
      this.sendMilestoneNotificationToMentor(milestone, celebrationNotes),
    ]);
  }

  /**
   * Send milestone celebration notification to the member
   */
  private async sendMilestoneNotificationToMember(
    milestone: MemberDiscipleshipMilestone,
    celebrationNotes?: string
  ): Promise<void> {
    try {
      // Get member details
      const member = await this.memberRepo.findById(milestone.member_id);
      if (!member) {
        return;
      }

      const recipientUserId = member.user_id;
      if (!recipientUserId && !member.email) {
        return;
      }

      // Get plan details if available
      let pathwayName = 'Discipleship';
      if (milestone.plan_id) {
        const plan = await this.planRepo.getById(milestone.plan_id);
        if (plan?.pathway) {
          pathwayName = plan.pathway;
        }
      }

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.DISCIPLESHIP_MILESTONE_REACHED,
        category: 'member',
        priority: 'normal',
        tenantId: milestone.tenant_id!,
        recipient: {
          userId: recipientUserId || '',
          email: member.email || undefined,
          phone: member.contact_number || undefined,
        },
        payload: {
          title: 'Milestone Reached!',
          message: `Congratulations! You've reached "${milestone.name}" in your ${pathwayName} journey. What a wonderful step of growth!`,
          memberName: `${member.first_name} ${member.last_name}`,
          recipientName: member.first_name,
          isRecipientMember: true,
          milestoneId: milestone.id,
          milestoneName: milestone.name,
          pathwayName,
          celebrationMessage: celebrationNotes,
          planUrl: `/members/${milestone.member_id}/discipleship`,
          actionType: 'redirect',
          actionPayload: `/members/${milestone.member_id}/discipleship`,
          // Email template type indicator
          emailTemplate: 'discipleship-milestone',
        },
        channels: recipientUserId ? ['in_app', 'email'] : ['email'],
      });
    } catch (error) {
      console.error('Failed to send milestone notification to member:', error);
    }
  }

  /**
   * Send milestone celebration notification to the mentor
   */
  private async sendMilestoneNotificationToMentor(
    milestone: MemberDiscipleshipMilestone,
    celebrationNotes?: string
  ): Promise<void> {
    try {
      // Get the plan to find the mentor
      if (!milestone.plan_id) {
        return; // No plan associated, can't find mentor
      }

      const plan = await this.planRepo.getById(milestone.plan_id);
      if (!plan || !plan.mentor_name) {
        return; // No mentor assigned
      }

      // Get member details (the person who reached the milestone)
      const member = await this.memberRepo.findById(milestone.member_id);
      if (!member) {
        return;
      }

      // Try to find the mentor by name
      const allMembers = await this.memberRepo.findAll();
      const mentor = allMembers.data.find(
        (m) => `${m.first_name} ${m.last_name}`.toLowerCase() === plan.mentor_name?.toLowerCase()
      );

      if (!mentor) {
        console.warn(`Mentor "${plan.mentor_name}" not found as a member, skipping notification`);
        return;
      }

      const recipientUserId = mentor.user_id;
      if (!recipientUserId && !mentor.email) {
        return;
      }

      const pathwayName = plan.pathway || 'Discipleship';

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.DISCIPLESHIP_MILESTONE_REACHED,
        category: 'member',
        priority: 'normal',
        tenantId: milestone.tenant_id!,
        recipient: {
          userId: recipientUserId || '',
          email: mentor.email || undefined,
          phone: mentor.contact_number || undefined,
        },
        payload: {
          title: 'Milestone Celebration',
          message: `${member.first_name} ${member.last_name} has reached "${milestone.name}" in their ${pathwayName} journey! Let's celebrate this moment of growth together.`,
          memberName: `${member.first_name} ${member.last_name}`,
          recipientName: mentor.first_name,
          isRecipientMember: false,
          milestoneId: milestone.id,
          milestoneName: milestone.name,
          pathwayName,
          celebrationMessage: celebrationNotes,
          planUrl: `/admin/community/discipleship/${plan.id}`,
          actionType: 'redirect',
          actionPayload: `/admin/community/discipleship/${plan.id}`,
          // Email template type indicator
          emailTemplate: 'discipleship-milestone',
        },
        channels: recipientUserId ? ['in_app', 'email'] : ['email'],
      });
    } catch (error) {
      console.error('Failed to send milestone notification to mentor:', error);
    }
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
