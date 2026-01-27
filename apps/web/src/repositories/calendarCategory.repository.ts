/**
 * Calendar Category Repository
 *
 * Data access interface for calendar event categories.
 * Delegates database operations to the calendar category adapter.
 *
 * @module planner.calendar
 * @featureCode planner.calendar
 *
 * @permission calendar:view - Required to read categories
 * @permission events:manage - Required to manage categories
 */
import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { CalendarCategory } from '@/models/calendarCategory.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { ICalendarCategoryAdapter } from '@/adapters/calendarCategory.adapter';

export interface ICalendarCategoryRepository extends BaseRepository<CalendarCategory> {
  getAll(): Promise<CalendarCategory[]>;
  getById(categoryId: string): Promise<CalendarCategory | null>;
  getByCode(code: string): Promise<CalendarCategory | null>;
  getActiveCategories(): Promise<CalendarCategory[]>;
  seedDefaultCategories(): Promise<void>;
}

@injectable()
export class CalendarCategoryRepository
  extends BaseRepository<CalendarCategory>
  implements ICalendarCategoryRepository
{
  constructor(
    @inject(TYPES.ICalendarCategoryAdapter)
    private readonly calendarCategoryAdapter: ICalendarCategoryAdapter
  ) {
    super(calendarCategoryAdapter);
  }

  protected override async afterCreate(_data: CalendarCategory): Promise<void> {
    NotificationService.showSuccess('Calendar category created.');
  }

  protected override async afterUpdate(_data: CalendarCategory): Promise<void> {
    NotificationService.showSuccess('Calendar category updated.');
  }

  async getAll(): Promise<CalendarCategory[]> {
    return this.calendarCategoryAdapter.getAll();
  }

  async getById(categoryId: string): Promise<CalendarCategory | null> {
    return this.calendarCategoryAdapter.getById(categoryId);
  }

  async getByCode(code: string): Promise<CalendarCategory | null> {
    return this.calendarCategoryAdapter.getByCode(code);
  }

  async getActiveCategories(): Promise<CalendarCategory[]> {
    return this.calendarCategoryAdapter.getActiveCategories();
  }

  async seedDefaultCategories(): Promise<void> {
    return this.calendarCategoryAdapter.seedDefaultCategories();
  }
}
