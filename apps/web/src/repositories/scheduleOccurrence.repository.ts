import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IScheduleOccurrenceAdapter } from '@/adapters/scheduleOccurrence.adapter';
import type {
  ScheduleOccurrence,
  ScheduleOccurrenceWithSchedule,
  ScheduleOccurrenceCreateInput,
  ScheduleOccurrenceUpdateInput,
  ScheduleOccurrenceFilters,
} from '@/models/scheduler/scheduleOccurrence.model';
import { TYPES } from '@/lib/types';

export interface IScheduleOccurrenceRepository extends BaseRepository<ScheduleOccurrence> {
  getById(id: string, tenantId: string): Promise<ScheduleOccurrenceWithSchedule | null>;
  getBySchedule(scheduleId: string, tenantId: string): Promise<ScheduleOccurrence[]>;
  getByDateRange(startDate: string, endDate: string, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  getByFilters(filters: ScheduleOccurrenceFilters, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  getByQrToken(token: string): Promise<ScheduleOccurrenceWithSchedule | null>;
  getUpcoming(days: number, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  createOccurrence(data: ScheduleOccurrenceCreateInput, tenantId: string): Promise<ScheduleOccurrence>;
  createMany(occurrences: ScheduleOccurrenceCreateInput[], tenantId: string): Promise<ScheduleOccurrence[]>;
  updateOccurrence(id: string, data: ScheduleOccurrenceUpdateInput, tenantId: string): Promise<ScheduleOccurrence>;
  updateCounts(id: string, counts: { registered_count?: number; waitlist_count?: number; checked_in_count?: number }): Promise<void>;
}

@injectable()
export class ScheduleOccurrenceRepository extends BaseRepository<ScheduleOccurrence> implements IScheduleOccurrenceRepository {
  constructor(@inject(TYPES.IScheduleOccurrenceAdapter) private readonly scheduleOccurrenceAdapter: IScheduleOccurrenceAdapter) {
    super(scheduleOccurrenceAdapter);
  }

  async getById(id: string, tenantId: string): Promise<ScheduleOccurrenceWithSchedule | null> {
    return await this.scheduleOccurrenceAdapter.getById(id, tenantId);
  }

  async getBySchedule(scheduleId: string, tenantId: string): Promise<ScheduleOccurrence[]> {
    return await this.scheduleOccurrenceAdapter.getBySchedule(scheduleId, tenantId);
  }

  async getByDateRange(startDate: string, endDate: string, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    return await this.scheduleOccurrenceAdapter.getByDateRange(startDate, endDate, tenantId);
  }

  async getByFilters(filters: ScheduleOccurrenceFilters, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    return await this.scheduleOccurrenceAdapter.getByFilters(filters, tenantId);
  }

  async getByQrToken(token: string): Promise<ScheduleOccurrenceWithSchedule | null> {
    return await this.scheduleOccurrenceAdapter.getByQrToken(token);
  }

  async getUpcoming(days: number, tenantId: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    return await this.scheduleOccurrenceAdapter.getUpcoming(days, tenantId);
  }

  async createOccurrence(data: ScheduleOccurrenceCreateInput, tenantId: string): Promise<ScheduleOccurrence> {
    return await this.scheduleOccurrenceAdapter.createOccurrence(data, tenantId);
  }

  async createMany(occurrences: ScheduleOccurrenceCreateInput[], tenantId: string): Promise<ScheduleOccurrence[]> {
    return await this.scheduleOccurrenceAdapter.createMany(occurrences, tenantId);
  }

  async updateOccurrence(id: string, data: ScheduleOccurrenceUpdateInput, tenantId: string): Promise<ScheduleOccurrence> {
    return await this.scheduleOccurrenceAdapter.updateOccurrence(id, data, tenantId);
  }

  async updateCounts(id: string, counts: { registered_count?: number; waitlist_count?: number; checked_in_count?: number }): Promise<void> {
    return await this.scheduleOccurrenceAdapter.updateCounts(id, counts);
  }
}
