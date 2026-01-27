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
import type { IMemberRepository } from '@/repositories/member.repository';
import type { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import { NotificationEventType } from '@/models/notification/notificationEvent.model';
import type { PlanningService } from '@/services/PlanningService';
import { randomUUID } from 'crypto';

/**
 * Service for managing member discipleship plans.
 *
 * @module members.discipleship
 *
 * @permission discipleshipplans:view - Required to read discipleship plan data (list, get by ID, get by member)
 * @permission discipleshipplans:manage - Required to create or update discipleship plans
 * @permission discipleshipplans:delete - Required to delete discipleship plans
 */
@injectable()
export class MemberDiscipleshipPlanService {
  constructor(
    @inject(TYPES.IMemberDiscipleshipPlanRepository)
    private repo: IMemberDiscipleshipPlanRepository,
    @inject(TYPES.IMemberRepository)
    private memberRepo: IMemberRepository,
    @inject(TYPES.NotificationBusService)
    private notificationBus: INotificationBusService,
    @inject(TYPES.PlanningService)
    private planningService: PlanningService,
  ) {}

  // ==================== TENANT-SCOPED QUERIES ====================

  /**
   * Get all discipleship plans for the current tenant
   *
   * @permission discipleshipplans:view
   */
  async getPlansForTenant(): Promise<MemberDiscipleshipPlan[]> {
    return this.repo.getAll();
  }

  /**
   * Get a specific discipleship plan by ID (tenant-scoped)
   *
   * @permission discipleshipplans:view
   */
  async getPlanById(planId: string): Promise<MemberDiscipleshipPlan | null> {
    return this.repo.getById(planId);
  }

  /**
   * Get all discipleship plans for a specific member
   *
   * @permission discipleshipplans:view
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
   *
   * @permission discipleshipplans:manage
   */
  async createPlan(data: Partial<MemberDiscipleshipPlan>): Promise<MemberDiscipleshipPlan> {
    // Set defaults if not provided
    const planData: Partial<MemberDiscipleshipPlan> = {
      ...data,
      status: data.status || 'active',
    };

    const plan = await this.repo.create(planData);

    // Send notifications to both the member and mentor
    if (plan.member_id) {
      await this.sendDiscipleshipPlanNotifications(plan);
    }

    // Auto-sync to calendar if there's a target date
    if (plan.target_date) {
      try {
        await this.planningService.syncDiscipleshipPlanEvent(plan);
      } catch (error) {
        console.error('Failed to sync discipleship plan to calendar:', error);
      }
    }

    return plan;
  }

  /**
   * Send notifications when a discipleship plan is created
   * Notifies both the member on the journey and the mentor (if assigned)
   */
  private async sendDiscipleshipPlanNotifications(plan: MemberDiscipleshipPlan): Promise<void> {
    // Notify both parties in parallel
    await Promise.all([
      this.sendNotificationToMemberForPlan(plan),
      this.sendNotificationToMentorForPlan(plan),
    ]);
  }

  /**
   * Send notification to the member starting their discipleship journey
   */
  private async sendNotificationToMemberForPlan(plan: MemberDiscipleshipPlan): Promise<void> {
    try {
      // Get member details to find their user account and contact info
      const member = await this.memberRepo.findById(plan.member_id);
      if (!member) {
        return; // Member not found
      }

      // Member must have a linked user account to receive in-app notifications
      const recipientUserId = member.user_id;

      // If no user account and no email, we can't notify them
      if (!recipientUserId && !member.email) {
        return;
      }

      // Build message based on plan details
      let message = 'Your journey of faith begins! A discipleship plan has been created for you.';
      if (plan.pathway) {
        message = `Your journey of faith begins! You've been enrolled in the "${plan.pathway}" pathway.`;
      }
      if (plan.mentor_name) {
        message += ` ${plan.mentor_name} will be walking alongside you as your mentor.`;
      }

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.DISCIPLESHIP_PLAN_ASSIGNED,
        category: 'member',
        priority: 'normal',
        tenantId: plan.tenant_id!,
        recipient: {
          userId: recipientUserId || '',
          email: member.email || undefined,
          phone: member.contact_number || undefined,
        },
        payload: {
          title: 'Your Journey of Growth Begins',
          message,
          memberName: `${member.first_name} ${member.last_name}`,
          recipientName: member.first_name,
          isRecipientMember: true,
          planId: plan.id,
          pathwayName: plan.pathway,
          mentorName: plan.mentor_name,
          nextStep: plan.next_step,
          targetDate: plan.target_date,
          planUrl: `/members/${plan.member_id}/discipleship`,
          actionType: 'redirect',
          actionPayload: `/members/${plan.member_id}/discipleship`,
          // Email template type indicator
          emailTemplate: 'discipleship-plan-created',
        },
        channels: recipientUserId ? ['in_app', 'email'] : ['email'],
      });
    } catch (error) {
      // Log error but don't fail the plan creation
      console.error('Failed to send discipleship plan notification to member:', error);
    }
  }

  /**
   * Send notification to the mentor assigned to the discipleship plan
   */
  private async sendNotificationToMentorForPlan(plan: MemberDiscipleshipPlan): Promise<void> {
    try {
      // Only notify if there's a mentor assigned
      if (!plan.mentor_name) {
        return; // No mentor assigned
      }

      // Get member details (the person on the journey)
      const member = await this.memberRepo.findById(plan.member_id);
      if (!member) {
        return; // Member not found
      }

      // Try to find the mentor by name to get their contact info
      // Note: mentor_name is a text field, so we search by name
      const allMembers = await this.memberRepo.findAll();
      const mentor = allMembers.data.find(
        (m) => `${m.first_name} ${m.last_name}`.toLowerCase() === plan.mentor_name?.toLowerCase()
      );

      // If we can't find the mentor as a member, we can't notify them
      if (!mentor) {
        console.warn(`Mentor "${plan.mentor_name}" not found as a member, skipping notification`);
        return;
      }

      const recipientUserId = mentor.user_id;
      if (!recipientUserId && !mentor.email) {
        return;
      }

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.DISCIPLESHIP_PLAN_ASSIGNED,
        category: 'member',
        priority: 'normal',
        tenantId: plan.tenant_id!,
        recipient: {
          userId: recipientUserId || '',
          email: mentor.email || undefined,
          phone: mentor.contact_number || undefined,
        },
        payload: {
          title: 'New Discipleship Assignment',
          message: `${member.first_name} ${member.last_name} is starting their "${plan.pathway || 'discipleship'}" journey, and you've been invited to walk alongside them as their mentor.`,
          memberName: `${member.first_name} ${member.last_name}`,
          recipientName: mentor.first_name,
          isRecipientMember: false,
          planId: plan.id,
          pathwayName: plan.pathway,
          mentorName: plan.mentor_name,
          nextStep: plan.next_step,
          targetDate: plan.target_date,
          planUrl: `/admin/community/discipleship/${plan.id}`,
          actionType: 'redirect',
          actionPayload: `/admin/community/discipleship/${plan.id}`,
          // Email template type indicator
          emailTemplate: 'discipleship-plan-created',
        },
        channels: recipientUserId ? ['in_app', 'email'] : ['email'],
      });
    } catch (error) {
      // Log error but don't fail the plan creation
      console.error('Failed to send discipleship plan notification to mentor:', error);
    }
  }

  /**
   * Update an existing discipleship plan
   *
   * @permission discipleshipplans:manage
   */
  async updatePlan(
    id: string,
    data: Partial<MemberDiscipleshipPlan>
  ): Promise<MemberDiscipleshipPlan> {
    const plan = await this.repo.update(id, data);

    // Auto-sync to calendar
    try {
      if (plan.target_date) {
        await this.planningService.syncDiscipleshipPlanEvent(plan);
      } else {
        // Remove calendar event if target date was cleared
        await this.planningService.removeDiscipleshipPlanEvent(plan.id);
      }
    } catch (error) {
      console.error('Failed to sync discipleship plan to calendar:', error);
    }

    return plan;
  }

  /**
   * Mark a discipleship plan as completed
   *
   * @permission discipleshipplans:manage
   */
  async completePlan(id: string): Promise<MemberDiscipleshipPlan> {
    return this.repo.update(id, {
      status: 'completed',
    });
  }

  /**
   * Reopen a completed discipleship plan
   *
   * @permission discipleshipplans:manage
   */
  async reopenPlan(id: string): Promise<MemberDiscipleshipPlan> {
    return this.repo.update(id, {
      status: 'active',
    });
  }

  /**
   * Soft delete a discipleship plan
   *
   * @permission discipleshipplans:delete
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
