import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IScheduleRegistrationAdapter } from '@/adapters/scheduleRegistration.adapter';
import type {
  ScheduleRegistration,
  ScheduleRegistrationWithMember,
  ScheduleRegistrationCreateInput,
  ScheduleRegistrationUpdateInput,
  ScheduleRegistrationFilters,
} from '@/models/scheduler/scheduleRegistration.model';
import { TYPES } from '@/lib/types';

export interface IScheduleRegistrationRepository extends BaseRepository<ScheduleRegistration> {
  getById(id: string, tenantId: string): Promise<ScheduleRegistrationWithMember | null>;
  getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleRegistrationWithMember[]>;
  getByMember(memberId: string, tenantId: string): Promise<ScheduleRegistration[]>;
  getByFilters(filters: ScheduleRegistrationFilters, tenantId: string): Promise<ScheduleRegistrationWithMember[]>;
  getByGuestEmail(email: string, occurrenceId: string, tenantId: string): Promise<ScheduleRegistration | null>;
  getWaitlist(occurrenceId: string, tenantId: string): Promise<ScheduleRegistrationWithMember[]>;
  createRegistration(data: ScheduleRegistrationCreateInput, tenantId: string): Promise<ScheduleRegistration>;
  updateRegistration(id: string, data: ScheduleRegistrationUpdateInput, tenantId: string): Promise<ScheduleRegistration>;
  cancelRegistration(id: string, tenantId: string): Promise<void>;
  promoteFromWaitlist(occurrenceId: string, tenantId: string): Promise<ScheduleRegistration | null>;
  getRegistrationCount(occurrenceId: string, tenantId: string): Promise<{ registered: number; waitlisted: number }>;
}

@injectable()
export class ScheduleRegistrationRepository extends BaseRepository<ScheduleRegistration> implements IScheduleRegistrationRepository {
  constructor(@inject(TYPES.IScheduleRegistrationAdapter) private readonly scheduleRegistrationAdapter: IScheduleRegistrationAdapter) {
    super(scheduleRegistrationAdapter);
  }

  async getById(id: string, tenantId: string): Promise<ScheduleRegistrationWithMember | null> {
    return await this.scheduleRegistrationAdapter.getById(id, tenantId);
  }

  async getByOccurrence(occurrenceId: string, tenantId: string): Promise<ScheduleRegistrationWithMember[]> {
    return await this.scheduleRegistrationAdapter.getByOccurrence(occurrenceId, tenantId);
  }

  async getByMember(memberId: string, tenantId: string): Promise<ScheduleRegistration[]> {
    return await this.scheduleRegistrationAdapter.getByMember(memberId, tenantId);
  }

  async getByFilters(filters: ScheduleRegistrationFilters, tenantId: string): Promise<ScheduleRegistrationWithMember[]> {
    return await this.scheduleRegistrationAdapter.getByFilters(filters, tenantId);
  }

  async getByGuestEmail(email: string, occurrenceId: string, tenantId: string): Promise<ScheduleRegistration | null> {
    return await this.scheduleRegistrationAdapter.getByGuestEmail(email, occurrenceId, tenantId);
  }

  async getWaitlist(occurrenceId: string, tenantId: string): Promise<ScheduleRegistrationWithMember[]> {
    return await this.scheduleRegistrationAdapter.getWaitlist(occurrenceId, tenantId);
  }

  async createRegistration(data: ScheduleRegistrationCreateInput, tenantId: string): Promise<ScheduleRegistration> {
    return await this.scheduleRegistrationAdapter.createRegistration(data, tenantId);
  }

  async updateRegistration(id: string, data: ScheduleRegistrationUpdateInput, tenantId: string): Promise<ScheduleRegistration> {
    return await this.scheduleRegistrationAdapter.updateRegistration(id, data, tenantId);
  }

  async cancelRegistration(id: string, tenantId: string): Promise<void> {
    return await this.scheduleRegistrationAdapter.cancelRegistration(id, tenantId);
  }

  async promoteFromWaitlist(occurrenceId: string, tenantId: string): Promise<ScheduleRegistration | null> {
    return await this.scheduleRegistrationAdapter.promoteFromWaitlist(occurrenceId, tenantId);
  }

  async getRegistrationCount(occurrenceId: string, tenantId: string): Promise<{ registered: number; waitlisted: number }> {
    return await this.scheduleRegistrationAdapter.getRegistrationCount(occurrenceId, tenantId);
  }
}
