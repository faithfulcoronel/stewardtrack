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

  async syncAllSources(): Promise<{ carePlans: number; discipleshipPlans: number }> {
    const carePlans = await this.eventRepo.syncFromCarePlans();
    const discipleshipPlans = await this.eventRepo.syncFromDiscipleshipPlans();
    return { carePlans, discipleshipPlans };
  }

  async syncCarePlans(): Promise<number> {
    return this.eventRepo.syncFromCarePlans();
  }

  async syncDiscipleshipPlans(): Promise<number> {
    return this.eventRepo.syncFromDiscipleshipPlans();
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

  // ==================== REPORTS ====================

  async getEventsByType(): Promise<Record<CalendarEventType, number>> {
    const events = await this.eventRepo.getAll();
    const byType: Record<CalendarEventType, number> = {
      care_plan: 0,
      discipleship: 0,
      meeting: 0,
      service: 0,
      event: 0,
      reminder: 0,
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
