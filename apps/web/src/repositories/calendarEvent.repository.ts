import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { CalendarEvent, CalendarEventFilters, CalendarEventView } from '@/models/calendarEvent.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { ICalendarEventAdapter } from '@/adapters/calendarEvent.adapter';

export interface ICalendarEventRepository extends BaseRepository<CalendarEvent> {
  getAll(): Promise<CalendarEvent[]>;
  getById(eventId: string): Promise<CalendarEvent | null>;
  getByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]>;
  getByFilters(filters: CalendarEventFilters): Promise<CalendarEvent[]>;
  getBySource(sourceType: string, sourceId: string): Promise<CalendarEvent[]>;
  getByMember(memberId: string): Promise<CalendarEvent[]>;
  getUpcoming(days?: number): Promise<CalendarEvent[]>;
  getEventsForCalendarView(startDate: string, endDate: string): Promise<CalendarEventView[]>;
  syncFromCarePlans(): Promise<number>;
  syncFromDiscipleshipPlans(): Promise<number>;
  syncFromMemberBirthdays(): Promise<number>;
  syncFromMemberAnniversaries(): Promise<number>;
}

@injectable()
export class CalendarEventRepository
  extends BaseRepository<CalendarEvent>
  implements ICalendarEventRepository
{
  constructor(
    @inject(TYPES.ICalendarEventAdapter)
    private readonly calendarEventAdapter: ICalendarEventAdapter
  ) {
    super(calendarEventAdapter);
  }

  protected override async afterCreate(_data: CalendarEvent): Promise<void> {
    NotificationService.showSuccess('Calendar event created.');
  }

  protected override async afterUpdate(_data: CalendarEvent): Promise<void> {
    NotificationService.showSuccess('Calendar event updated.');
  }

  async getAll(): Promise<CalendarEvent[]> {
    return this.calendarEventAdapter.getAll();
  }

  async getById(eventId: string): Promise<CalendarEvent | null> {
    return this.calendarEventAdapter.getById(eventId);
  }

  async getByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    return this.calendarEventAdapter.getByDateRange(startDate, endDate);
  }

  async getByFilters(filters: CalendarEventFilters): Promise<CalendarEvent[]> {
    return this.calendarEventAdapter.getByFilters(filters);
  }

  async getBySource(sourceType: string, sourceId: string): Promise<CalendarEvent[]> {
    return this.calendarEventAdapter.getBySource(sourceType, sourceId);
  }

  async getByMember(memberId: string): Promise<CalendarEvent[]> {
    return this.calendarEventAdapter.getByMember(memberId);
  }

  async getUpcoming(days?: number): Promise<CalendarEvent[]> {
    return this.calendarEventAdapter.getUpcoming(days);
  }

  async getEventsForCalendarView(startDate: string, endDate: string): Promise<CalendarEventView[]> {
    return this.calendarEventAdapter.getEventsForCalendarView(startDate, endDate);
  }

  async syncFromCarePlans(): Promise<number> {
    return this.calendarEventAdapter.syncFromCarePlans();
  }

  async syncFromDiscipleshipPlans(): Promise<number> {
    return this.calendarEventAdapter.syncFromDiscipleshipPlans();
  }

  async syncFromMemberBirthdays(): Promise<number> {
    return this.calendarEventAdapter.syncFromMemberBirthdays();
  }

  async syncFromMemberAnniversaries(): Promise<number> {
    return this.calendarEventAdapter.syncFromMemberAnniversaries();
  }
}
