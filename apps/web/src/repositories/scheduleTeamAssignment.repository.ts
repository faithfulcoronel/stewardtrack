/**
 * Schedule Team Assignment Repository
 *
 * Data access interface for team assignment records.
 * Delegates database operations to the schedule team assignment adapter.
 *
 * @module planner.scheduler
 * @featureCode planner.scheduler
 *
 * @permission scheduler:view - Required to read team assignments
 * @permission scheduler:manage - Required to manage team assignments
 */
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IScheduleTeamAssignmentAdapter } from '@/adapters/scheduleTeamAssignment.adapter';
import type {
  ScheduleTeamAssignment,
  ScheduleTeamAssignmentWithMember,
  ScheduleTeamAssignmentCreateInput,
  ScheduleTeamAssignmentUpdateInput,
} from '@/models/scheduler/scheduleTeamAssignment.model';
import { TYPES } from '@/lib/types';

export interface IScheduleTeamAssignmentRepository extends BaseRepository<ScheduleTeamAssignment> {
  getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleTeamAssignmentWithMember[]>;
  getByMember(memberId: string, tenantId: string): Promise<ScheduleTeamAssignment[]>;
  getByOccurrenceAndMember(occurrenceId: string, memberId: string, tenantId: string): Promise<ScheduleTeamAssignment | null>;
  getPendingByMember(memberId: string, tenantId: string): Promise<ScheduleTeamAssignmentWithMember[]>;
  createAssignment(data: ScheduleTeamAssignmentCreateInput, tenantId: string): Promise<ScheduleTeamAssignment>;
  updateAssignment(id: string, data: ScheduleTeamAssignmentUpdateInput, tenantId: string): Promise<ScheduleTeamAssignment>;
  deleteAssignment(id: string, tenantId: string): Promise<void>;
  confirmAssignment(id: string, tenantId: string): Promise<ScheduleTeamAssignment>;
  declineAssignment(id: string, reason: string, tenantId: string): Promise<ScheduleTeamAssignment>;
}

@injectable()
export class ScheduleTeamAssignmentRepository extends BaseRepository<ScheduleTeamAssignment> implements IScheduleTeamAssignmentRepository {
  constructor(@inject(TYPES.IScheduleTeamAssignmentAdapter) private readonly scheduleTeamAssignmentAdapter: IScheduleTeamAssignmentAdapter) {
    super(scheduleTeamAssignmentAdapter);
  }

  async getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleTeamAssignmentWithMember[]> {
    return await this.scheduleTeamAssignmentAdapter.getByOccurrence(occurrenceId, tenantId);
  }

  async getByMember(memberId: string, tenantId: string): Promise<ScheduleTeamAssignment[]> {
    return await this.scheduleTeamAssignmentAdapter.getByMember(memberId, tenantId);
  }

  async getByOccurrenceAndMember(occurrenceId: string, memberId: string, tenantId: string): Promise<ScheduleTeamAssignment | null> {
    return await this.scheduleTeamAssignmentAdapter.getByOccurrenceAndMember(occurrenceId, memberId, tenantId);
  }

  async getPendingByMember(memberId: string, tenantId: string): Promise<ScheduleTeamAssignmentWithMember[]> {
    return await this.scheduleTeamAssignmentAdapter.getPendingByMember(memberId, tenantId);
  }

  async createAssignment(data: ScheduleTeamAssignmentCreateInput, tenantId: string): Promise<ScheduleTeamAssignment> {
    return await this.scheduleTeamAssignmentAdapter.createAssignment(data, tenantId);
  }

  async updateAssignment(id: string, data: ScheduleTeamAssignmentUpdateInput, tenantId: string): Promise<ScheduleTeamAssignment> {
    return await this.scheduleTeamAssignmentAdapter.updateAssignment(id, data, tenantId);
  }

  async deleteAssignment(id: string, tenantId: string): Promise<void> {
    return await this.scheduleTeamAssignmentAdapter.deleteAssignment(id, tenantId);
  }

  async confirmAssignment(id: string, tenantId: string): Promise<ScheduleTeamAssignment> {
    return await this.scheduleTeamAssignmentAdapter.confirmAssignment(id, tenantId);
  }

  async declineAssignment(id: string, reason: string, tenantId: string): Promise<ScheduleTeamAssignment> {
    return await this.scheduleTeamAssignmentAdapter.declineAssignment(id, reason, tenantId);
  }
}
