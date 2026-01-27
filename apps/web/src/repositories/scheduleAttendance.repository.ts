/**
 * Schedule Attendance Repository
 *
 * Data access interface for attendance records.
 * Delegates database operations to the schedule attendance adapter.
 *
 * @module planner.attendance
 * @featureCode planner.attendance
 *
 * @permission attendance:manage - Required for all attendance operations
 */
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IScheduleAttendanceAdapter } from '@/adapters/scheduleAttendance.adapter';
import type {
  ScheduleAttendance,
  ScheduleAttendanceWithMember,
  ScheduleAttendanceCreateInput,
  ScheduleAttendanceFilters,
} from '@/models/scheduler/scheduleAttendance.model';
import { TYPES } from '@/lib/types';

export interface IScheduleAttendanceRepository extends BaseRepository<ScheduleAttendance> {
  getById(id: string, tenantId: string): Promise<ScheduleAttendanceWithMember | null>;
  getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleAttendanceWithMember[]>;
  getByMember(memberId: string, tenantId: string): Promise<ScheduleAttendance[]>;
  getByFilters(filters: ScheduleAttendanceFilters, tenantId: string): Promise<ScheduleAttendanceWithMember[]>;
  getByOccurrenceAndMember(occurrenceId: string, memberId: string, tenantId: string): Promise<ScheduleAttendance | null>;
  createAttendance(data: ScheduleAttendanceCreateInput, tenantId: string, userId?: string): Promise<ScheduleAttendance>;
  checkout(id: string, tenantId: string): Promise<ScheduleAttendance>;
  deleteAttendance(id: string, tenantId: string): Promise<void>;
  getAttendanceCount(occurrenceId: string, tenantId: string): Promise<number>;
  getAttendanceByMethod(occurrenceId: string, tenantId: string): Promise<{ method: string; count: number }[]>;
}

@injectable()
export class ScheduleAttendanceRepository extends BaseRepository<ScheduleAttendance> implements IScheduleAttendanceRepository {
  constructor(@inject(TYPES.IScheduleAttendanceAdapter) private readonly scheduleAttendanceAdapter: IScheduleAttendanceAdapter) {
    super(scheduleAttendanceAdapter);
  }

  async getById(id: string, tenantId: string): Promise<ScheduleAttendanceWithMember | null> {
    return await this.scheduleAttendanceAdapter.getById(id, tenantId);
  }

  async getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleAttendanceWithMember[]> {
    return await this.scheduleAttendanceAdapter.getByOccurrence(occurrenceId, tenantId);
  }

  async getByMember(memberId: string, tenantId: string): Promise<ScheduleAttendance[]> {
    return await this.scheduleAttendanceAdapter.getByMember(memberId, tenantId);
  }

  async getByFilters(filters: ScheduleAttendanceFilters, tenantId: string): Promise<ScheduleAttendanceWithMember[]> {
    return await this.scheduleAttendanceAdapter.getByFilters(filters, tenantId);
  }

  async getByOccurrenceAndMember(occurrenceId: string, memberId: string, tenantId: string): Promise<ScheduleAttendance | null> {
    return await this.scheduleAttendanceAdapter.getByOccurrenceAndMember(occurrenceId, memberId, tenantId);
  }

  async createAttendance(data: ScheduleAttendanceCreateInput, tenantId: string, userId?: string): Promise<ScheduleAttendance> {
    return await this.scheduleAttendanceAdapter.createAttendance(data, tenantId, userId);
  }

  async checkout(id: string, tenantId: string): Promise<ScheduleAttendance> {
    return await this.scheduleAttendanceAdapter.checkout(id, tenantId);
  }

  async deleteAttendance(id: string, tenantId: string): Promise<void> {
    return await this.scheduleAttendanceAdapter.deleteAttendance(id, tenantId);
  }

  async getAttendanceCount(occurrenceId: string, tenantId: string): Promise<number> {
    return await this.scheduleAttendanceAdapter.getAttendanceCount(occurrenceId, tenantId);
  }

  async getAttendanceByMethod(occurrenceId: string, tenantId: string): Promise<{ method: string; count: number }[]> {
    return await this.scheduleAttendanceAdapter.getAttendanceByMethod(occurrenceId, tenantId);
  }
}
