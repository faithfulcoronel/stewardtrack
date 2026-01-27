/**
 * Ministry Schedule Repository
 *
 * Data access interface for ministry schedule records.
 * Delegates database operations to the ministry schedule adapter.
 *
 * @module planner.scheduler
 * @featureCode planner.scheduler
 *
 * @permission scheduler:view - Required to read schedule data
 * @permission scheduler:manage - Required to create/update schedules
 * @permission scheduler:delete - Required to soft-delete schedules
 */
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IMinistryScheduleAdapter } from '@/adapters/ministrySchedule.adapter';
import type {
  MinistrySchedule,
  MinistryScheduleWithMinistry,
  MinistryScheduleCreateInput,
  MinistryScheduleUpdateInput,
  MinistryScheduleFilters,
} from '@/models/scheduler/ministrySchedule.model';
import { TYPES } from '@/lib/types';

export interface IMinistryScheduleRepository extends BaseRepository<MinistrySchedule> {
  getAll(tenantId: string): Promise<MinistryScheduleWithMinistry[]>;
  getById(id: string, tenantId: string): Promise<MinistryScheduleWithMinistry | null>;
  getByMinistry(ministryId: string, tenantId: string): Promise<MinistrySchedule[]>;
  getByFilters(filters: MinistryScheduleFilters, tenantId: string): Promise<MinistryScheduleWithMinistry[]>;
  getActive(tenantId: string): Promise<MinistryScheduleWithMinistry[]>;
  createSchedule(data: MinistryScheduleCreateInput, tenantId: string, userId?: string): Promise<MinistrySchedule>;
  updateSchedule(id: string, data: MinistryScheduleUpdateInput, tenantId: string, userId?: string): Promise<MinistrySchedule>;
  softDelete(id: string, tenantId: string): Promise<void>;
}

@injectable()
export class MinistryScheduleRepository extends BaseRepository<MinistrySchedule> implements IMinistryScheduleRepository {
  constructor(@inject(TYPES.IMinistryScheduleAdapter) private readonly ministryScheduleAdapter: IMinistryScheduleAdapter) {
    super(ministryScheduleAdapter);
  }

  async getAll(tenantId: string): Promise<MinistryScheduleWithMinistry[]> {
    return await this.ministryScheduleAdapter.getAll(tenantId);
  }

  async getById(id: string, tenantId: string): Promise<MinistryScheduleWithMinistry | null> {
    return await this.ministryScheduleAdapter.getById(id, tenantId);
  }

  async getByMinistry(ministryId: string, tenantId: string): Promise<MinistrySchedule[]> {
    return await this.ministryScheduleAdapter.getByMinistry(ministryId, tenantId);
  }

  async getByFilters(filters: MinistryScheduleFilters, tenantId: string): Promise<MinistryScheduleWithMinistry[]> {
    return await this.ministryScheduleAdapter.getByFilters(filters, tenantId);
  }

  async getActive(tenantId: string): Promise<MinistryScheduleWithMinistry[]> {
    return await this.ministryScheduleAdapter.getActive(tenantId);
  }

  async createSchedule(data: MinistryScheduleCreateInput, tenantId: string, userId?: string): Promise<MinistrySchedule> {
    return await this.ministryScheduleAdapter.createSchedule(data, tenantId, userId);
  }

  async updateSchedule(id: string, data: MinistryScheduleUpdateInput, tenantId: string, userId?: string): Promise<MinistrySchedule> {
    return await this.ministryScheduleAdapter.updateSchedule(id, data, tenantId, userId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    return await this.ministryScheduleAdapter.softDelete(id, tenantId);
  }
}
