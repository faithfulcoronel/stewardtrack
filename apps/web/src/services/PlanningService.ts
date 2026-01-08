import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ICalendarEventRepository } from '@/repositories/calendarEvent.repository';
import type { ICalendarCategoryRepository } from '@/repositories/calendarCategory.repository';
import type {
  CalendarEvent,
  CalendarEventCreateInput,
  CalendarEventUpdateInput,
  CalendarEventFilters,
  CalendarEventView,
  CalendarEventType,
  CalendarEventStatus,
} from '@/models/calendarEvent.model';
import type { CalendarCategory, CalendarCategoryCreateInput } from '@/models/calendarCategory.model';
import { QueryOptions } from '@/adapters/base.adapter';

export interface PlanningDashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  carePlanEvents: number;
  discipleshipEvents: number;
  completedThisWeek: number;
  overdueEvents: number;
}

export interface PlanningCalendarData {
  events: CalendarEventView[];
  categories: CalendarCategory[];
  stats: PlanningDashboardStats;
}

@injectable()
export class PlanningService {
  constructor(
    @inject(TYPES.ICalendarEventRepository)
    private eventRepo: ICalendarEventRepository,
    @inject(TYPES.ICalendarCategoryRepository)
    private categoryRepo: ICalendarCategoryRepository
  ) {}

  // ==================== CALENDAR EVENTS ====================

  async getEvents(options: QueryOptions = {}): Promise<{ data: CalendarEvent[]; count: number }> {
    const events = await this.eventRepo.find({
      ...options,
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        is_active: { operator: 'eq', value: true },
        ...(options.filters || {}),
      },
    });
    return { data: events.data, count: events.count ?? 0 };
  }

  async getEventById(id: string): Promise<CalendarEvent | null> {
    return this.eventRepo.getById(id);
  }

  async getEventsByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    return this.eventRepo.getByDateRange(startDate, endDate);
  }

  async getEventsByFilters(filters: CalendarEventFilters): Promise<CalendarEvent[]> {
    return this.eventRepo.getByFilters(filters);
  }

  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    return this.eventRepo.getUpcoming(days);
  }

  async getEventsForMember(memberId: string): Promise<CalendarEvent[]> {
    return this.eventRepo.getByMember(memberId);
  }

  async getEventsForCalendarView(
    startDate: string,
    endDate: string
  ): Promise<CalendarEventView[]> {
    return this.eventRepo.getEventsForCalendarView(startDate, endDate);
  }

  async createEvent(data: CalendarEventCreateInput): Promise<CalendarEvent> {
    return this.eventRepo.create(data as Partial<CalendarEvent>);
  }

  async updateEvent(id: string, data: CalendarEventUpdateInput): Promise<CalendarEvent> {
    return this.eventRepo.update(id, data as Partial<CalendarEvent>);
  }

  async deleteEvent(id: string): Promise<void> {
    await this.eventRepo.delete(id);
  }

  async updateEventStatus(id: string, status: CalendarEventStatus): Promise<CalendarEvent> {
    return this.eventRepo.update(id, { status });
  }

  async markEventCompleted(id: string): Promise<CalendarEvent> {
    return this.updateEventStatus(id, 'completed');
  }

  async markEventCancelled(id: string): Promise<CalendarEvent> {
    return this.updateEventStatus(id, 'cancelled');
  }

  // ==================== CALENDAR CATEGORIES ====================

  async getCategories(): Promise<CalendarCategory[]> {
    return this.categoryRepo.getActiveCategories();
  }

  async getCategoryById(id: string): Promise<CalendarCategory | null> {
    return this.categoryRepo.getById(id);
  }

  async getCategoryByCode(code: string): Promise<CalendarCategory | null> {
    return this.categoryRepo.getByCode(code);
  }

  async createCategory(data: CalendarCategoryCreateInput): Promise<CalendarCategory> {
    return this.categoryRepo.create(data as Partial<CalendarCategory>);
  }

  async updateCategory(
    id: string,
    data: Partial<CalendarCategory>
  ): Promise<CalendarCategory> {
    return this.categoryRepo.update(id, data);
  }

  async seedDefaultCategories(): Promise<void> {
    return this.categoryRepo.seedDefaultCategories();
  }

  // ==================== SYNC OPERATIONS ====================

  async syncAllSources(): Promise<{ carePlans: number; discipleshipPlans: number; birthdays: number; anniversaries: number }> {
    const carePlans = await this.eventRepo.syncFromCarePlans();
    const discipleshipPlans = await this.eventRepo.syncFromDiscipleshipPlans();
    const birthdays = await this.eventRepo.syncFromMemberBirthdays();
    const anniversaries = await this.eventRepo.syncFromMemberAnniversaries();
    return { carePlans, discipleshipPlans, birthdays, anniversaries };
  }

  async syncCarePlans(): Promise<number> {
    return this.eventRepo.syncFromCarePlans();
  }

  async syncDiscipleshipPlans(): Promise<number> {
    return this.eventRepo.syncFromDiscipleshipPlans();
  }

  async syncBirthdays(): Promise<number> {
    return this.eventRepo.syncFromMemberBirthdays();
  }

  async syncAnniversaries(): Promise<number> {
    return this.eventRepo.syncFromMemberAnniversaries();
  }

  // ==================== SINGLE ITEM SYNC ====================

  /**
   * Sync a single care plan to the calendar (create or update)
   * Call this when a care plan is created or updated
   */
  async syncCarePlanEvent(carePlan: {
    id: string;
    member_id: string;
    status_label?: string | null;
    status_code?: string | null;
    follow_up_at?: string | null;
    priority?: string | null;
    details?: string | null;
    assigned_to?: string | null;
    is_active?: boolean;
  }): Promise<void> {
    // Skip if no follow-up date
    if (!carePlan.follow_up_at) {
      return;
    }

    const category = await this.getCategoryByCode('care_plan');
    const title = `Care Plan: ${carePlan.status_label || carePlan.status_code || 'Follow-up'}`;

    // Check if event already exists
    const existingEvents = await this.eventRepo.getBySource('member_care_plans', carePlan.id);
    const existingEvent = existingEvents[0];

    if (existingEvent) {
      // Update existing event
      await this.eventRepo.update(existingEvent.id, {
        title,
        description: carePlan.details,
        start_at: carePlan.follow_up_at,
        priority: (carePlan.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
        assigned_to: carePlan.assigned_to,
        source_id: carePlan.id,
        member_id: carePlan.member_id,
        is_active: carePlan.is_active !== false,
      });
    } else {
      // Create new event
      await this.eventRepo.create({
        title,
        description: carePlan.details,
        start_at: carePlan.follow_up_at,
        all_day: false,
        timezone: 'UTC',
        category_id: category?.id || null,
        event_type: 'care_plan',
        status: 'scheduled',
        priority: (carePlan.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
        source_type: 'member_care_plans',
        source_id: carePlan.id,
        member_id: carePlan.member_id,
        assigned_to: carePlan.assigned_to,
        is_recurring: false,
        is_private: false,
        visibility: 'team',
        tags: ['care-plan', 'follow-up'],
        metadata: {},
        is_active: true,
      });
    }
  }

  /**
   * Sync a single discipleship plan to the calendar (create or update)
   * Call this when a discipleship plan is created or updated
   */
  async syncDiscipleshipPlanEvent(plan: {
    id: string;
    member_id: string;
    pathway?: string | null;
    status?: string | null;
    target_date?: string | null;
    mentor_name?: string | null;
    notes?: string | null;
  }): Promise<void> {
    // Skip if no target date
    if (!plan.target_date) {
      return;
    }

    const category = await this.getCategoryByCode('discipleship');
    const title = `Discipleship: ${plan.pathway || plan.status || 'Milestone'}`;

    // Check if event already exists
    const existingEvents = await this.eventRepo.getBySource('member_discipleship_plans', plan.id);
    const existingEvent = existingEvents[0];

    if (existingEvent) {
      // Update existing event
      await this.eventRepo.update(existingEvent.id, {
        title,
        description: plan.notes,
        start_at: plan.target_date,
        source_id: plan.id,
        member_id: plan.member_id,
        metadata: { mentor_name: plan.mentor_name },
      });
    } else {
      // Create new event
      await this.eventRepo.create({
        title,
        description: plan.notes,
        start_at: plan.target_date,
        all_day: true,
        timezone: 'UTC',
        category_id: category?.id || null,
        event_type: 'discipleship',
        status: 'scheduled',
        priority: 'normal',
        source_type: 'member_discipleship_plans',
        source_id: plan.id,
        member_id: plan.member_id,
        assigned_to: null,
        is_recurring: false,
        is_private: false,
        visibility: 'team',
        tags: ['discipleship', 'milestone'],
        metadata: { mentor_name: plan.mentor_name },
        is_active: true,
      });
    }
  }

  /**
   * Sync a member's birthday to the calendar (create or update)
   * Call this when a member is created or their birthday is updated
   */
  async syncMemberBirthdayEvent(member: {
    id: string;
    first_name: string;
    last_name: string;
    birthday?: string | null;
  }): Promise<void> {
    // Skip if no birthday
    if (!member.birthday) {
      return;
    }

    const category = await this.getCategoryByCode('birthday');
    const title = `🎂 ${member.first_name} ${member.last_name}'s Birthday`;
    // Use member.id as source_id (source_type differentiates birthday from anniversary)
    const sourceId = member.id;

    // Calculate this year's birthday
    const birthDate = new Date(member.birthday);
    const now = new Date();
    let birthdayThisYear = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    // If birthday has passed this year, use next year
    if (birthdayThisYear < now) {
      birthdayThisYear = new Date(now.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
    }

    // Check if event already exists
    const existingEvents = await this.eventRepo.getBySource('member_birthday', sourceId);
    const existingEvent = existingEvents[0];

    if (existingEvent) {
      // Update existing event
      await this.eventRepo.update(existingEvent.id, {
        title,
        start_at: birthdayThisYear.toISOString(),
        source_id: sourceId,
        member_id: member.id,
        is_recurring: true,
        recurrence_rule: 'FREQ=YEARLY',
      });
    } else {
      // Create new event
      await this.eventRepo.create({
        title,
        description: `Birthday celebration for ${member.first_name} ${member.last_name}`,
        start_at: birthdayThisYear.toISOString(),
        all_day: true,
        timezone: 'UTC',
        category_id: category?.id || null,
        event_type: 'birthday',
        status: 'scheduled',
        priority: 'normal',
        source_type: 'member_birthday',
        source_id: sourceId,
        member_id: member.id,
        assigned_to: null,
        is_recurring: true,
        recurrence_rule: 'FREQ=YEARLY',
        is_private: false,
        visibility: 'team',
        tags: ['birthday', 'celebration'],
        metadata: { original_date: member.birthday },
        is_active: true,
      });
    }
  }

  /**
   * Sync a member's wedding anniversary to the calendar (create or update)
   * Call this when a member is created or their anniversary date is updated
   */
  async syncMemberAnniversaryEvent(member: {
    id: string;
    first_name: string;
    last_name: string;
    anniversary?: string | null;
  }): Promise<void> {
    // Skip if no anniversary date
    if (!member.anniversary) {
      return;
    }

    const category = await this.getCategoryByCode('anniversary');
    const title = `💍 ${member.first_name} ${member.last_name}'s Wedding Anniversary`;
    // Use member.id as source_id (source_type differentiates birthday from anniversary)
    const sourceId = member.id;

    // Calculate this year's anniversary
    const anniversaryDate = new Date(member.anniversary);
    const now = new Date();
    let anniversaryThisYear = new Date(now.getFullYear(), anniversaryDate.getMonth(), anniversaryDate.getDate());

    // If anniversary has passed this year, use next year
    if (anniversaryThisYear < now) {
      anniversaryThisYear = new Date(now.getFullYear() + 1, anniversaryDate.getMonth(), anniversaryDate.getDate());
    }

    // Calculate years married
    const yearsSinceWedding = anniversaryThisYear.getFullYear() - anniversaryDate.getFullYear();

    // Check if event already exists
    const existingEvents = await this.eventRepo.getBySource('member_anniversary', sourceId);
    const existingEvent = existingEvents[0];

    if (existingEvent) {
      // Update existing event
      await this.eventRepo.update(existingEvent.id, {
        title,
        description: `${yearsSinceWedding} year${yearsSinceWedding !== 1 ? 's' : ''} married`,
        start_at: anniversaryThisYear.toISOString(),
        source_id: sourceId,
        member_id: member.id,
        is_recurring: true,
        recurrence_rule: 'FREQ=YEARLY',
        metadata: { original_date: member.anniversary, years_married: yearsSinceWedding },
      });
    } else {
      // Create new event
      await this.eventRepo.create({
        title,
        description: `${yearsSinceWedding} year${yearsSinceWedding !== 1 ? 's' : ''} married`,
        start_at: anniversaryThisYear.toISOString(),
        all_day: true,
        timezone: 'UTC',
        category_id: category?.id || null,
        event_type: 'anniversary',
        status: 'scheduled',
        priority: 'normal',
        source_type: 'member_anniversary',
        source_id: sourceId,
        member_id: member.id,
        assigned_to: null,
        is_recurring: true,
        recurrence_rule: 'FREQ=YEARLY',
        is_private: false,
        visibility: 'team',
        tags: ['anniversary', 'celebration'],
        metadata: { original_date: member.anniversary, years_married: yearsSinceWedding },
        is_active: true,
      });
    }
  }

  /**
   * Remove calendar event for a care plan (when deleted)
   */
  async removeCarePlanEvent(carePlanId: string): Promise<void> {
    const existingEvents = await this.eventRepo.getBySource('member_care_plans', carePlanId);
    for (const event of existingEvents) {
      await this.eventRepo.delete(event.id);
    }
  }

  /**
   * Remove calendar event for a discipleship plan (when deleted)
   */
  async removeDiscipleshipPlanEvent(planId: string): Promise<void> {
    const existingEvents = await this.eventRepo.getBySource('member_discipleship_plans', planId);
    for (const event of existingEvents) {
      await this.eventRepo.delete(event.id);
    }
  }

  /**
   * Remove calendar event for a member's birthday (when member deleted or birthday cleared)
   */
  async removeMemberBirthdayEvent(memberId: string): Promise<void> {
    // Use member.id as source_id (source_type differentiates birthday from anniversary)
    const existingEvents = await this.eventRepo.getBySource('member_birthday', memberId);
    for (const event of existingEvents) {
      await this.eventRepo.delete(event.id);
    }
  }

  /**
   * Remove calendar event for a member's anniversary (when member deleted or anniversary cleared)
   */
  async removeMemberAnniversaryEvent(memberId: string): Promise<void> {
    // Use member.id as source_id (source_type differentiates birthday from anniversary)
    const existingEvents = await this.eventRepo.getBySource('member_anniversary', memberId);
    for (const event of existingEvents) {
      await this.eventRepo.delete(event.id);
    }
  }

  // ==================== DASHBOARD & STATS ====================

  async getDashboardStats(): Promise<PlanningDashboardStats> {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);

    // Get all active events
    const allEvents = await this.eventRepo.getAll();

    // Calculate stats
    const stats: PlanningDashboardStats = {
      totalEvents: allEvents.length,
      upcomingEvents: 0,
      carePlanEvents: 0,
      discipleshipEvents: 0,
      completedThisWeek: 0,
      overdueEvents: 0,
    };

    for (const event of allEvents) {
      const eventDate = new Date(event.start_at);

      // Count event types
      if (event.event_type === 'care_plan') {
        stats.carePlanEvents++;
      } else if (event.event_type === 'discipleship') {
        stats.discipleshipEvents++;
      }

      // Count upcoming (within next 7 days)
      if (
        eventDate >= now &&
        eventDate <= weekAhead &&
        event.status !== 'completed' &&
        event.status !== 'cancelled'
      ) {
        stats.upcomingEvents++;
      }

      // Count completed this week
      if (event.status === 'completed' && eventDate >= weekAgo && eventDate <= now) {
        stats.completedThisWeek++;
      }

      // Count overdue (past events not completed/cancelled)
      if (
        eventDate < now &&
        event.status !== 'completed' &&
        event.status !== 'cancelled'
      ) {
        stats.overdueEvents++;
      }
    }

    return stats;
  }

  async getCalendarData(
    startDate: string,
    endDate: string
  ): Promise<PlanningCalendarData> {
    const [events, categories, stats] = await Promise.all([
      this.getEventsForCalendarView(startDate, endDate),
      this.getCategories(),
      this.getDashboardStats(),
    ]);

    return { events, categories, stats };
  }

  // ==================== QUICK ACTIONS ====================

  async createQuickEvent(
    title: string,
    startAt: string,
    eventType: CalendarEventType = 'general'
  ): Promise<CalendarEvent> {
    // Find category by event type
    const category = await this.getCategoryByCode(eventType);

    return this.createEvent({
      title,
      start_at: startAt,
      event_type: eventType,
      category_id: category?.id || null,
      status: 'scheduled',
      priority: 'normal',
      all_day: false,
    });
  }

  async createCarePlanFollowUp(
    memberId: string,
    carePlanId: string,
    title: string,
    followUpDate: string,
    assignedTo?: string
  ): Promise<CalendarEvent> {
    const category = await this.getCategoryByCode('care_plan');

    return this.createEvent({
      title: `Care Plan: ${title}`,
      start_at: followUpDate,
      event_type: 'care_plan',
      category_id: category?.id || null,
      source_type: 'member_care_plans',
      source_id: carePlanId,
      member_id: memberId,
      assigned_to: assignedTo,
      status: 'scheduled',
      priority: 'high',
      tags: ['care-plan', 'follow-up'],
    });
  }

  async createDiscipleshipMilestone(
    memberId: string,
    discipleshipPlanId: string,
    title: string,
    targetDate: string,
    mentorId?: string
  ): Promise<CalendarEvent> {
    const category = await this.getCategoryByCode('discipleship');

    return this.createEvent({
      title: `Discipleship: ${title}`,
      start_at: targetDate,
      all_day: true,
      event_type: 'discipleship',
      category_id: category?.id || null,
      source_type: 'member_discipleship_plans',
      source_id: discipleshipPlanId,
      member_id: memberId,
      assigned_to: mentorId,
      status: 'scheduled',
      priority: 'normal',
      tags: ['discipleship', 'milestone'],
    });
  }

  // ==================== GOALS CALENDAR SYNC ====================

  /**
   * Sync a goal's target date to the calendar (create or update)
   * Call this when a goal is created or its target_date is updated
   */
  async syncGoalEvent(goal: {
    id: string;
    title: string;
    description?: string | null;
    target_date?: string | null;
    owner_id?: string | null;
    status?: string | null;
    category_name?: string | null;
    visibility?: string | null;
  }): Promise<void> {
    // Skip if no target date
    if (!goal.target_date) {
      return;
    }

    const category = await this.getCategoryByCode('goals');
    const title = `Goal Target: ${goal.title}`;

    // Map goal status to calendar priority
    const priorityMap: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
      draft: 'low',
      active: 'normal',
      on_track: 'normal',
      at_risk: 'high',
      behind: 'urgent',
      completed: 'low',
      cancelled: 'low',
    };
    const priority = priorityMap[goal.status || 'active'] || 'normal';

    // Check if event already exists
    const existingEvents = await this.eventRepo.getBySource('goals', goal.id);
    const existingEvent = existingEvents[0];

    if (existingEvent) {
      // Update existing event
      await this.eventRepo.update(existingEvent.id, {
        title,
        description: goal.description,
        start_at: goal.target_date,
        priority,
        assigned_to: goal.owner_id,
        source_id: goal.id,
        is_active: goal.status !== 'completed' && goal.status !== 'cancelled',
      });
    } else {
      // Create new event
      await this.eventRepo.create({
        title,
        description: goal.description || `Target deadline for goal: ${goal.title}`,
        start_at: goal.target_date,
        all_day: true,
        timezone: 'UTC',
        category_id: category?.id || null,
        event_type: 'goal',
        status: 'scheduled',
        priority,
        source_type: 'goals',
        source_id: goal.id,
        member_id: null,
        assigned_to: goal.owner_id,
        is_recurring: false,
        is_private: goal.visibility === 'private',
        visibility: goal.visibility === 'private' ? 'private' : 'team',
        tags: ['goal', 'target-date', goal.category_name || 'strategic'].filter(Boolean) as string[],
        metadata: { categoryName: goal.category_name },
        is_active: goal.status !== 'completed' && goal.status !== 'cancelled',
      });
    }
  }

  /**
   * Remove a goal event from the calendar
   * Call this when a goal is deleted
   */
  async removeGoalEvent(goalId: string): Promise<void> {
    const existingEvents = await this.eventRepo.getBySource('goals', goalId);
    for (const event of existingEvents) {
      await this.eventRepo.delete(event.id);
    }
  }

  /**
   * Sync an objective's due date to the calendar (create or update)
   * Call this when an objective is created or its due_date is updated
   */
  async syncObjectiveEvent(objective: {
    id: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    responsible_id?: string | null;
    status?: string | null;
    priority?: string | null;
    goal_id: string;
    goal_title: string;
  }): Promise<void> {
    // Skip if no due date
    if (!objective.due_date) {
      return;
    }

    const category = await this.getCategoryByCode('goals');
    const title = `Objective Due: ${objective.title}`;

    // Map objective priority to calendar priority
    const priorityMap: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
      low: 'low',
      normal: 'normal',
      high: 'high',
      urgent: 'urgent',
    };
    const priority = priorityMap[objective.priority || 'normal'] || 'normal';

    // Check if event already exists (objectives use source_type='objectives' and source_id=UUID)
    const existingEvents = await this.eventRepo.getBySource('objectives', objective.id);
    const existingEvent = existingEvents[0];

    if (existingEvent) {
      // Update existing event
      await this.eventRepo.update(existingEvent.id, {
        title,
        description: `${objective.description || ''}\n\nGoal: ${objective.goal_title}`,
        start_at: objective.due_date,
        priority,
        assigned_to: objective.responsible_id,
        source_id: objective.id,
        is_active: objective.status !== 'completed' && objective.status !== 'cancelled',
      });
    } else {
      // Create new event
      await this.eventRepo.create({
        title,
        description: `${objective.description || ''}\n\nGoal: ${objective.goal_title}`,
        start_at: objective.due_date,
        all_day: true,
        timezone: 'UTC',
        category_id: category?.id || null,
        event_type: 'goal',
        status: 'scheduled',
        priority,
        source_type: 'objectives',
        source_id: objective.id,
        member_id: null,
        assigned_to: objective.responsible_id,
        is_recurring: false,
        is_private: false,
        visibility: 'team',
        tags: ['goal', 'objective', 'due-date'],
        metadata: { goalId: objective.goal_id, goalTitle: objective.goal_title },
        is_active: objective.status !== 'completed' && objective.status !== 'cancelled',
      });
    }
  }

  /**
   * Remove an objective event from the calendar
   * Call this when an objective is deleted
   */
  async removeObjectiveEvent(objectiveId: string): Promise<void> {
    const existingEvents = await this.eventRepo.getBySource('objectives', objectiveId);
    for (const event of existingEvents) {
      await this.eventRepo.delete(event.id);
    }
  }

  // ==================== REPORTS ====================

  async getEventsByType(): Promise<Record<CalendarEventType, number>> {
    const events = await this.eventRepo.getAll();
    const byType: Record<CalendarEventType, number> = {
      care_plan: 0,
      discipleship: 0,
      birthday: 0,
      anniversary: 0,
      meeting: 0,
      service: 0,
      event: 0,
      reminder: 0,
      goal: 0,
      general: 0,
    };

    for (const event of events) {
      byType[event.event_type]++;
    }

    return byType;
  }

  async getEventsByStatus(): Promise<Record<CalendarEventStatus, number>> {
    const events = await this.eventRepo.getAll();
    const byStatus: Record<CalendarEventStatus, number> = {
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      postponed: 0,
    };

    for (const event of events) {
      byStatus[event.status]++;
    }

    return byStatus;
  }
}
