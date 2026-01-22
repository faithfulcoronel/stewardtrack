import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMemberCarePlanRepository } from '@/repositories/memberCarePlan.repository';
import type { IMemberRepository } from '@/repositories/member.repository';
import type { MemberCarePlan } from '@/models/memberCarePlan.model';
import { QueryOptions } from '@/adapters/base.adapter';
import type { CrudService } from '@/services/CrudService';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import { NotificationEventType } from '@/models/notification/notificationEvent.model';
import type { NotificationPriority } from '@/models/notification/notification.model';
import type { PlanningService } from '@/services/PlanningService';
import { randomUUID } from 'crypto';

@injectable()
export class MemberCarePlanService implements CrudService<MemberCarePlan> {
  constructor(
    @inject(TYPES.IMemberCarePlanRepository)
    private repo: IMemberCarePlanRepository,
    @inject(TYPES.IMemberRepository)
    private memberRepo: IMemberRepository,
    @inject(TYPES.NotificationBusService)
    private notificationBus: INotificationBusService,
    @inject(TYPES.PlanningService)
    private planningService: PlanningService,
  ) {}

  /**
   * Find care plans with pagination and filters
   */
  find(options: QueryOptions = {}) {
    return this.repo.find({
      ...options,
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        ...(options.filters || {}),
      },
    });
  }

  /**
   * Find all care plans without pagination
   */
  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll({
      ...options,
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        ...(options.filters || {}),
      },
    });
  }

  /**
   * Find care plan by ID
   */
  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  /**
   * Create a new care plan
   */
  create(data: Partial<MemberCarePlan>) {
    return this.repo.create(data);
  }

  /**
   * Update an existing care plan
   */
  update(id: string, data: Partial<MemberCarePlan>) {
    return this.repo.update(id, data);
  }

  /**
   * Soft delete a care plan
   */
  delete(id: string) {
    return this.repo.delete(id);
  }

  /**
   * Get all care plans for the current tenant
   */
  async getCarePlansForTenant(): Promise<MemberCarePlan[]> {
    return this.repo.getAll();
  }

  /**
   * Get all care plans with member and caregiver information for GraphQL
   */
  async getCarePlansWithMembers(): Promise<MemberCarePlan[]> {
    return this.repo.getAllWithMembers();
  }

  /**
   * Get a specific care plan by ID (tenant-scoped)
   */
  async getCarePlanById(carePlanId: string): Promise<MemberCarePlan | null> {
    return this.repo.getById(carePlanId);
  }

  /**
   * Get all care plans for a specific member
   */
  async getCarePlansByMember(memberId: string): Promise<MemberCarePlan[]> {
    return this.repo.getByMember(memberId);
  }

  /**
   * Get active care plans for the current tenant
   */
  async getActiveCarePlansForTenant(): Promise<MemberCarePlan[]> {
    const carePlans = await this.repo.getAll();
    return carePlans
      .filter((plan: MemberCarePlan) => plan.is_active)
      .sort((a: MemberCarePlan, b: MemberCarePlan) => {
        if (!a.follow_up_at) return 1;
        if (!b.follow_up_at) return -1;
        return new Date(a.follow_up_at).getTime() - new Date(b.follow_up_at).getTime();
      });
  }

  /**
   * Get care plans by status for the current tenant
   */
  async getCarePlansByStatus(statusCode: string): Promise<MemberCarePlan[]> {
    const carePlans = await this.repo.getAll();
    return carePlans
      .filter((plan: MemberCarePlan) => plan.status_code === statusCode)
      .sort((a: MemberCarePlan, b: MemberCarePlan) => {
        if (!a.follow_up_at) return 1;
        if (!b.follow_up_at) return -1;
        return new Date(a.follow_up_at).getTime() - new Date(b.follow_up_at).getTime();
      });
  }

  /**
   * Get care plans by priority for the current tenant
   */
  async getCarePlansByPriority(priority: string): Promise<MemberCarePlan[]> {
    const carePlans = await this.repo.getAll();
    return carePlans
      .filter((plan: MemberCarePlan) => plan.priority === priority)
      .sort((a: MemberCarePlan, b: MemberCarePlan) => {
        if (!a.follow_up_at) return 1;
        if (!b.follow_up_at) return -1;
        return new Date(a.follow_up_at).getTime() - new Date(b.follow_up_at).getTime();
      });
  }

  /**
   * Get care plans assigned to a specific user for the current tenant
   */
  async getCarePlansByAssignedUser(assignedTo: string): Promise<MemberCarePlan[]> {
    const carePlans = await this.repo.getAll();
    return carePlans
      .filter((plan: MemberCarePlan) => plan.assigned_to === assignedTo)
      .sort((a: MemberCarePlan, b: MemberCarePlan) => {
        if (!a.follow_up_at) return 1;
        if (!b.follow_up_at) return -1;
        return new Date(a.follow_up_at).getTime() - new Date(b.follow_up_at).getTime();
      });
  }

  /**
   * Get upcoming care plan follow-ups (within next 7 days) for the current tenant
   */
  async getUpcomingFollowUpsForTenant(): Promise<MemberCarePlan[]> {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const carePlans = await this.repo.getAll();

    return carePlans
      .filter((plan: MemberCarePlan) => {
        if (!plan.is_active || !plan.follow_up_at) return false;
        const followUpDate = new Date(plan.follow_up_at);
        return followUpDate >= today && followUpDate <= nextWeek;
      })
      .sort((a: MemberCarePlan, b: MemberCarePlan) => {
        return new Date(a.follow_up_at!).getTime() - new Date(b.follow_up_at!).getTime();
      });
  }

  /**
   * Create a new care plan for a member
   */
  async createCarePlan(data: Partial<MemberCarePlan>): Promise<MemberCarePlan> {
    // Set defaults
    const carePlanData: Partial<MemberCarePlan> = {
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
    };

    const carePlan = await this.repo.create(carePlanData);

    // Send notifications to both the member receiving care and the assigned caregiver
    if (carePlan.member_id) {
      await this.sendCarePlanNotifications(carePlan);
    }

    // Auto-sync to calendar if there's a follow-up date
    if (carePlan.follow_up_at) {
      try {
        await this.planningService.syncCarePlanEvent(carePlan);
      } catch (error) {
        console.error('Failed to sync care plan to calendar:', error);
      }
    }

    return carePlan;
  }

  /**
   * Send notifications when a care plan is created
   * Notifies both the member receiving care and the assigned caregiver
   */
  private async sendCarePlanNotifications(carePlan: MemberCarePlan): Promise<void> {
    // Notify both parties in parallel
    await Promise.all([
      this.sendNotificationToMember(carePlan),
      this.sendNotificationToCaregiver(carePlan),
    ]);
  }

  /**
   * Send notification to the member receiving care
   */
  private async sendNotificationToMember(carePlan: MemberCarePlan): Promise<void> {
    try {
      // Get member details to find their user account and contact info
      const member = await this.memberRepo.findById(carePlan.member_id);
      if (!member) {
        return; // Member not found
      }

      // Member must have a linked user account to receive in-app notifications
      // They can still receive email/SMS without a user account
      const recipientUserId = member.user_id;

      // If no user account and no email, we can't notify them
      if (!recipientUserId && !member.email) {
        return;
      }

      // Map priority for notification
      const priorityMap: Record<string, NotificationPriority> = {
        'low': 'low',
        'normal': 'normal',
        'high': 'high',
        'urgent': 'urgent',
        'critical': 'urgent',
      };
      const priority = priorityMap[carePlan.priority || 'normal'] || 'normal';

      // Get caregiver name if assigned
      let caregiverName: string | undefined;
      if (carePlan.assigned_to_member_id) {
        const caregiver = await this.memberRepo.findById(carePlan.assigned_to_member_id);
        if (caregiver) {
          caregiverName = `${caregiver.first_name} ${caregiver.last_name}`;
        }
      }

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.CARE_PLAN_ASSIGNED,
        category: 'member',
        priority,
        tenantId: carePlan.tenant_id!,
        recipient: {
          userId: recipientUserId || '', // Empty if no user account - email/SMS only
          email: member.email || undefined,
          phone: member.contact_number || undefined,
        },
        payload: {
          title: 'You Are in Our Care',
          message: caregiverName
            ? `${caregiverName} has been assigned to walk alongside you during this season.`
            : 'Someone from our church family will be reaching out to walk alongside you.',
          memberName: `${member.first_name} ${member.last_name}`,
          recipientName: member.first_name,
          caregiverName,
          carePlanId: carePlan.id,
          statusLabel: carePlan.status_label || carePlan.status_code,
          followUpDate: carePlan.follow_up_at,
          careContext: carePlan.details,
          actionType: 'redirect',
          actionPayload: `/members/${carePlan.member_id}/care`,
          // Email template type indicator
          emailTemplate: 'care-plan-member-notification',
        },
        channels: recipientUserId ? ['in_app', 'email'] : ['email'],
      });
    } catch (error) {
      // Log error but don't fail the care plan creation
      console.error('Failed to send care plan notification to member:', error);
    }
  }

  /**
   * Send notification to the assigned caregiver
   */
  private async sendNotificationToCaregiver(carePlan: MemberCarePlan): Promise<void> {
    try {
      // Check if there's an assigned caregiver
      if (!carePlan.assigned_to_member_id) {
        return; // No caregiver assigned
      }

      // Get caregiver details
      const caregiver = await this.memberRepo.findById(carePlan.assigned_to_member_id);
      if (!caregiver) {
        return; // Caregiver not found
      }

      // Caregiver must have a linked user account or email to receive notifications
      const recipientUserId = caregiver.user_id;
      if (!recipientUserId && !caregiver.email) {
        return;
      }

      // Get member details (the person receiving care)
      const member = await this.memberRepo.findById(carePlan.member_id);
      if (!member) {
        return; // Member not found
      }

      // Map priority for notification
      const priorityMap: Record<string, NotificationPriority> = {
        'low': 'low',
        'normal': 'normal',
        'high': 'high',
        'urgent': 'urgent',
        'critical': 'urgent',
      };
      const priority = priorityMap[carePlan.priority || 'normal'] || 'normal';

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.CARE_PLAN_ASSIGNED,
        category: 'member',
        priority,
        tenantId: carePlan.tenant_id!,
        recipient: {
          userId: recipientUserId || '', // Empty if no user account - email/SMS only
          email: caregiver.email || undefined,
          phone: caregiver.contact_number || undefined,
        },
        payload: {
          title: 'Care Ministry Assignment',
          message: `You've been invited to walk alongside ${member.first_name} ${member.last_name}. Your care and prayers can make a meaningful difference.`,
          memberName: `${member.first_name} ${member.last_name}`,
          recipientName: caregiver.first_name,
          carePlanId: carePlan.id,
          statusLabel: carePlan.status_label || carePlan.status_code,
          followUpDate: carePlan.follow_up_at,
          careContext: carePlan.details,
          carePlanUrl: `/admin/community/care-plans/${carePlan.id}`,
          actionType: 'redirect',
          actionPayload: `/admin/community/care-plans/${carePlan.id}`,
          // Email template type indicator
          emailTemplate: 'care-plan-assigned',
        },
        channels: recipientUserId ? ['in_app', 'email'] : ['email'],
      });
    } catch (error) {
      // Log error but don't fail the care plan creation
      console.error('Failed to send care plan notification to caregiver:', error);
    }
  }

  /**
   * Update an existing care plan
   */
  async updateCarePlan(
    id: string,
    data: Partial<MemberCarePlan>
  ): Promise<MemberCarePlan> {
    const carePlan = await this.repo.update(id, data);

    // Auto-sync to calendar
    try {
      if (carePlan.follow_up_at) {
        await this.planningService.syncCarePlanEvent(carePlan);
      } else {
        // Remove calendar event if follow-up date was cleared
        await this.planningService.removeCarePlanEvent(carePlan.id);
      }
    } catch (error) {
      console.error('Failed to sync care plan to calendar:', error);
    }

    return carePlan;
  }

  /**
   * Close a care plan
   */
  async closeCarePlan(id: string): Promise<MemberCarePlan> {
    return this.repo.update(id, {
      is_active: false,
      closed_at: new Date().toISOString(),
      status_code: 'completed',
      status_label: 'Completed',
    });
  }

  /**
   * Reopen a care plan
   */
  async reopenCarePlan(id: string): Promise<MemberCarePlan> {
    return this.repo.update(id, {
      is_active: true,
      closed_at: null,
      status_code: 'active',
      status_label: 'Active',
    });
  }

  /**
   * Get care plan statistics for the dashboard
   */
  async getCarePlanStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    urgent: number;
    completed: number;
  }> {
    const carePlans = await this.repo.getAll();

    const stats = {
      total: carePlans.length,
      active: 0,
      pending: 0,
      urgent: 0,
      completed: 0,
    };

    for (const plan of carePlans) {
      if (!plan.is_active) {
        stats.completed++;
      } else if (plan.priority === 'urgent' || plan.priority === 'critical') {
        stats.urgent++;
        stats.active++;
      } else if (plan.status_code === 'pending' || plan.status_code === 'new') {
        stats.pending++;
        stats.active++;
      } else {
        stats.active++;
      }
    }

    return stats;
  }

  /**
   * Get recent care plans for the timeline
   */
  async getRecentCarePlans(limit = 5): Promise<Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string | null;
    status: string;
    created_at: string | null;
  }>> {
    const carePlans = await this.repo.getAll();

    return carePlans
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit)
      .map((plan) => ({
        id: plan.id,
        title: plan.status_label || plan.status_code || 'Care Plan',
        description: plan.details || null,
        priority: plan.priority || null,
        status: plan.is_active ? 'active' : 'completed',
        created_at: plan.created_at || null,
      }));
  }
}
