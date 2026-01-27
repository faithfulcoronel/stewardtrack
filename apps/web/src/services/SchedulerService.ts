/**
 * Scheduler Service
 *
 * Business logic layer for ministry scheduling.
 * Manages worship services, bible studies, rehearsals, conferences, and seminars.
 *
 * @module planner.scheduler
 * @featureCode planner.scheduler
 *
 * @permission scheduler:view - Required to view schedules and occurrences
 * @permission scheduler:manage - Required to create, update schedules
 * @permission scheduler:delete - Required to delete schedules
 * @permission attendance:manage - Required to manage attendance records
 */
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import type { IMinistryScheduleRepository } from '@/repositories/ministrySchedule.repository';
import type { IScheduleOccurrenceRepository } from '@/repositories/scheduleOccurrence.repository';
import type { ICalendarEventRepository } from '@/repositories/calendarEvent.repository';
import type {
  MinistrySchedule,
  MinistryScheduleWithMinistry,
  MinistryScheduleCreateInput,
  MinistryScheduleUpdateInput,
  MinistryScheduleFilters,
  MinistryScheduleView,
  ScheduleType,
} from '@/models/scheduler/ministrySchedule.model';
import type {
  ScheduleOccurrenceCreateInput,
  OccurrenceGenerationResult,
} from '@/models/scheduler/scheduleOccurrence.model';

const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  service: 'Worship Service',
  bible_study: 'Bible Study',
  rehearsal: 'Rehearsal',
  conference: 'Conference',
  seminar: 'Seminar',
  meeting: 'Meeting',
  other: 'Other',
};

export interface ISchedulerService {
  // Schedule CRUD
  getAll(tenantId?: string): Promise<MinistryScheduleWithMinistry[]>;
  getById(id: string, tenantId?: string): Promise<MinistryScheduleWithMinistry | null>;
  getByMinistry(ministryId: string, tenantId?: string): Promise<MinistrySchedule[]>;
  getByFilters(filters: MinistryScheduleFilters, tenantId?: string): Promise<MinistryScheduleWithMinistry[]>;
  getActive(tenantId?: string): Promise<MinistryScheduleWithMinistry[]>;
  createSchedule(data: MinistryScheduleCreateInput, tenantId?: string, userId?: string): Promise<MinistrySchedule>;
  updateSchedule(id: string, data: MinistryScheduleUpdateInput, tenantId?: string, userId?: string): Promise<MinistrySchedule>;
  deleteSchedule(id: string, tenantId?: string): Promise<void>;

  // Occurrence Generation
  generateOccurrences(
    scheduleId: string,
    startDate: string,
    endDate: string,
    tenantId?: string
  ): Promise<OccurrenceGenerationResult>;

  // View Transformation
  toScheduleView(schedule: MinistryScheduleWithMinistry, upcomingCount?: number): MinistryScheduleView;
  toScheduleViewList(schedules: MinistryScheduleWithMinistry[]): MinistryScheduleView[];

  // Utilities
  parseRecurrenceDescription(rrule: string | null): string | null;
}

@injectable()
export class SchedulerService implements ISchedulerService {
  constructor(
    @inject(TYPES.IMinistryScheduleRepository) private scheduleRepository: IMinistryScheduleRepository,
    @inject(TYPES.IScheduleOccurrenceRepository) private occurrenceRepository: IScheduleOccurrenceRepository,
    @inject(TYPES.ICalendarEventRepository) private calendarEventRepository: ICalendarEventRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  // ==================== Schedule CRUD ====================

  async getAll(tenantId?: string): Promise<MinistryScheduleWithMinistry[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.scheduleRepository.getAll(effectiveTenantId);
  }

  async getById(id: string, tenantId?: string): Promise<MinistryScheduleWithMinistry | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.scheduleRepository.getById(id, effectiveTenantId);
  }

  async getByMinistry(ministryId: string, tenantId?: string): Promise<MinistrySchedule[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.scheduleRepository.getByMinistry(ministryId, effectiveTenantId);
  }

  async getByFilters(filters: MinistryScheduleFilters, tenantId?: string): Promise<MinistryScheduleWithMinistry[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.scheduleRepository.getByFilters(filters, effectiveTenantId);
  }

  async getActive(tenantId?: string): Promise<MinistryScheduleWithMinistry[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.scheduleRepository.getActive(effectiveTenantId);
  }

  async createSchedule(data: MinistryScheduleCreateInput, tenantId?: string, userId?: string): Promise<MinistrySchedule> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.scheduleRepository.createSchedule(data, effectiveTenantId, userId);
  }

  async updateSchedule(id: string, data: MinistryScheduleUpdateInput, tenantId?: string, userId?: string): Promise<MinistrySchedule> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const updatedSchedule = await this.scheduleRepository.updateSchedule(id, data, effectiveTenantId, userId);

    // Sync existing occurrences to the planner calendar after schedule update
    try {
      const existingOccurrences = await this.occurrenceRepository.getBySchedule(id, effectiveTenantId);
      for (const occurrence of existingOccurrences) {
        try {
          await this.calendarEventRepository.syncSingleOccurrence(occurrence.id);
        } catch (error) {
          console.error(`[SchedulerService] Failed to sync occurrence ${occurrence.id} to calendar:`, error);
        }
      }
    } catch (error) {
      console.error(`[SchedulerService] Failed to sync schedule occurrences to calendar:`, error);
    }

    return updatedSchedule;
  }

  async deleteSchedule(id: string, tenantId?: string): Promise<void> {
    console.log(`[SchedulerService.deleteSchedule] Called with id: ${id}, tenantId: ${tenantId ?? 'undefined'}`);

    const effectiveTenantId = await this.resolveTenantId(tenantId);
    console.log(`[SchedulerService.deleteSchedule] Resolved tenantId: ${effectiveTenantId}`);

    // First, get all occurrences for this schedule and delete their calendar events
    try {
      const occurrences = await this.occurrenceRepository.getBySchedule(id, effectiveTenantId);
      console.log(`[SchedulerService.deleteSchedule] Found ${occurrences.length} occurrences to clean up`);
      for (const occurrence of occurrences) {
        try {
          await this.calendarEventRepository.deleteBySource('schedule_occurrence', occurrence.id);
        } catch (error) {
          console.error(`[SchedulerService] Failed to delete calendar event for occurrence ${occurrence.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`[SchedulerService] Failed to delete calendar events for schedule:`, error);
    }

    console.log(`[SchedulerService.deleteSchedule] Calling scheduleRepository.softDelete...`);
    await this.scheduleRepository.softDelete(id, effectiveTenantId);
    console.log(`[SchedulerService.deleteSchedule] softDelete completed for schedule: ${id}`);
  }

  // ==================== Occurrence Generation ====================

  async generateOccurrences(
    scheduleId: string,
    startDate: string,
    endDate: string,
    tenantId?: string
  ): Promise<OccurrenceGenerationResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Get the schedule
    const schedule = await this.scheduleRepository.getById(scheduleId, effectiveTenantId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Get existing occurrences in date range to avoid duplicates
    const existingOccurrences = await this.occurrenceRepository.getByFilters(
      { scheduleId, startDate, endDate },
      effectiveTenantId
    );
    const existingDates = new Set(existingOccurrences.map(o => o.occurrence_date));

    // Generate occurrence dates based on recurrence rule
    const dates = this.generateDates(schedule, startDate, endDate);

    // Filter out dates that already have occurrences
    const newDates = dates.filter(date => !existingDates.has(date));

    if (newDates.length === 0) {
      return { created: 0, skipped: dates.length, occurrences: [] };
    }

    // Create occurrence records
    const occurrenceInputs: ScheduleOccurrenceCreateInput[] = newDates.map(date => {
      // Combine date with time to create full timestamp
      const startAt = `${date}T${schedule.start_time}`;
      const endAt = schedule.end_time ? `${date}T${schedule.end_time}` : null;

      return {
        schedule_id: scheduleId,
        occurrence_date: date,
        start_at: startAt,
        end_at: endAt,
        status: 'scheduled' as const,
      };
    });

    const occurrences = await this.occurrenceRepository.createMany(occurrenceInputs, effectiveTenantId);

    // Sync each new occurrence to the planner calendar
    for (const occurrence of occurrences) {
      try {
        await this.calendarEventRepository.syncSingleOccurrence(occurrence.id);
      } catch (error) {
        console.error(`[SchedulerService] Failed to sync occurrence ${occurrence.id} to calendar:`, error);
        // Continue syncing other occurrences even if one fails
      }
    }

    return {
      created: occurrences.length,
      skipped: dates.length - newDates.length,
      occurrences,
    };
  }

  private generateDates(schedule: MinistrySchedule, startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const recurrenceStart = new Date(schedule.recurrence_start_date);
    const recurrenceEnd = schedule.recurrence_end_date ? new Date(schedule.recurrence_end_date) : null;

    // Use the later of startDate or recurrence_start_date
    const effectiveStart = start > recurrenceStart ? start : recurrenceStart;

    // Use the earlier of endDate or recurrence_end_date
    const effectiveEnd = recurrenceEnd && recurrenceEnd < end ? recurrenceEnd : end;

    if (!schedule.recurrence_rule) {
      // Non-recurring: just check if recurrence_start_date is within range
      if (recurrenceStart >= effectiveStart && recurrenceStart <= effectiveEnd) {
        dates.push(schedule.recurrence_start_date);
      }
      return dates;
    }

    // Parse RRULE and generate dates
    const rruleParts = this.parseRRule(schedule.recurrence_rule);

    let current = new Date(effectiveStart);
    const maxIterations = 365; // Safety limit
    let iterations = 0;

    while (current <= effectiveEnd && iterations < maxIterations) {
      if (this.matchesRRule(current, rruleParts, recurrenceStart)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
      iterations++;
    }

    return dates;
  }

  private parseRRule(rrule: string): Record<string, string> {
    const parts: Record<string, string> = {};
    const components = rrule.replace('RRULE:', '').split(';');

    for (const component of components) {
      const [key, value] = component.split('=');
      if (key && value) {
        parts[key] = value;
      }
    }

    return parts;
  }

  private matchesRRule(date: Date, rruleParts: Record<string, string>, startDate: Date): boolean {
    const freq = rruleParts['FREQ'];
    const interval = parseInt(rruleParts['INTERVAL'] || '1', 10);
    const byDay = rruleParts['BYDAY']?.split(',') || [];

    switch (freq) {
      case 'DAILY':
        const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff % interval === 0;

      case 'WEEKLY':
        const weeksDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        if (weeksDiff < 0 || weeksDiff % interval !== 0) {
          return false;
        }
        if (byDay.length > 0) {
          const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          const dayName = dayNames[date.getDay()];
          return byDay.includes(dayName);
        }
        return date.getDay() === startDate.getDay();

      case 'MONTHLY':
        const monthsDiff =
          (date.getFullYear() - startDate.getFullYear()) * 12 +
          (date.getMonth() - startDate.getMonth());
        if (monthsDiff < 0 || monthsDiff % interval !== 0) {
          return false;
        }
        return date.getDate() === startDate.getDate();

      case 'YEARLY':
        const yearsDiff = date.getFullYear() - startDate.getFullYear();
        if (yearsDiff < 0 || yearsDiff % interval !== 0) {
          return false;
        }
        return date.getMonth() === startDate.getMonth() && date.getDate() === startDate.getDate();

      default:
        return false;
    }
  }

  // ==================== View Transformation ====================

  toScheduleView(schedule: MinistryScheduleWithMinistry, upcomingCount: number = 0): MinistryScheduleView {
    return {
      id: schedule.id,
      ministryId: schedule.ministry_id,
      ministryName: schedule.ministry.name,
      ministryColor: schedule.ministry.color,
      name: schedule.name,
      description: schedule.description,
      scheduleType: schedule.schedule_type,
      scheduleTypeLabel: SCHEDULE_TYPE_LABELS[schedule.schedule_type],
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      timezone: schedule.timezone,
      recurrenceRule: schedule.recurrence_rule,
      recurrenceDescription: this.parseRecurrenceDescription(schedule.recurrence_rule ?? null),
      location: schedule.location,
      locationType: schedule.location_type,
      virtualMeetingUrl: schedule.virtual_meeting_url,
      capacity: schedule.capacity,
      registrationRequired: schedule.registration_required,
      isActive: schedule.is_active,
      upcomingOccurrenceCount: upcomingCount,
    };
  }

  toScheduleViewList(schedules: MinistryScheduleWithMinistry[]): MinistryScheduleView[] {
    return schedules.map(s => this.toScheduleView(s));
  }

  // ==================== Utilities ====================

  parseRecurrenceDescription(rrule: string | null): string | null {
    if (!rrule) {
      return 'One-time event';
    }

    const parts = this.parseRRule(rrule);
    const freq = parts['FREQ'];
    const interval = parseInt(parts['INTERVAL'] || '1', 10);
    const byDay = parts['BYDAY']?.split(',') || [];

    const dayNameMap: Record<string, string> = {
      SU: 'Sunday',
      MO: 'Monday',
      TU: 'Tuesday',
      WE: 'Wednesday',
      TH: 'Thursday',
      FR: 'Friday',
      SA: 'Saturday',
    };

    switch (freq) {
      case 'DAILY':
        return interval === 1 ? 'Every day' : `Every ${interval} days`;

      case 'WEEKLY':
        const days = byDay.map(d => dayNameMap[d] || d).join(', ');
        if (interval === 1) {
          return days ? `Every week on ${days}` : 'Every week';
        }
        return days ? `Every ${interval} weeks on ${days}` : `Every ${interval} weeks`;

      case 'MONTHLY':
        return interval === 1 ? 'Every month' : `Every ${interval} months`;

      case 'YEARLY':
        return interval === 1 ? 'Every year' : `Every ${interval} years`;

      default:
        return rrule;
    }
  }
}
