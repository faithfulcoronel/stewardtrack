/**
 * Ministry Repository
 *
 * Data access interface for ministry records.
 * Delegates database operations to the ministry adapter.
 *
 * @module planner.ministries
 * @featureCode planner.ministries
 *
 * @permission ministries:view - Required to read ministry data
 * @permission ministries:manage - Required to create/update ministries
 * @permission ministries:delete - Required to soft-delete ministries
 */
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IMinistryAdapter } from '@/adapters/ministry.adapter';
import type {
  Ministry,
  MinistryWithLeader,
  MinistryWithTeam,
  MinistryCreateInput,
  MinistryUpdateInput,
  MinistryFilters,
} from '@/models/scheduler/ministry.model';
import { TYPES } from '@/lib/types';

export interface IMinistryRepository extends BaseRepository<Ministry> {
  getAll(tenantId: string): Promise<Ministry[]>;
  getById(id: string, tenantId: string): Promise<MinistryWithLeader | null>;
  getByCode(code: string, tenantId: string): Promise<Ministry | null>;
  getByFilters(filters: MinistryFilters, tenantId: string): Promise<Ministry[]>;
  getWithTeamCounts(tenantId: string): Promise<MinistryWithTeam[]>;
  createMinistry(data: MinistryCreateInput, tenantId: string, userId?: string): Promise<Ministry>;
  updateMinistry(id: string, data: MinistryUpdateInput, tenantId: string, userId?: string): Promise<Ministry>;
  softDelete(id: string, tenantId: string): Promise<void>;
}

@injectable()
export class MinistryRepository extends BaseRepository<Ministry> implements IMinistryRepository {
  constructor(@inject(TYPES.IMinistryAdapter) private readonly ministryAdapter: IMinistryAdapter) {
    super(ministryAdapter);
  }

  async getAll(tenantId: string): Promise<Ministry[]> {
    return await this.ministryAdapter.getAll(tenantId);
  }

  async getById(id: string, tenantId: string): Promise<MinistryWithLeader | null> {
    return await this.ministryAdapter.getById(id, tenantId);
  }

  async getByCode(code: string, tenantId: string): Promise<Ministry | null> {
    return await this.ministryAdapter.getByCode(code, tenantId);
  }

  async getByFilters(filters: MinistryFilters, tenantId: string): Promise<Ministry[]> {
    return await this.ministryAdapter.getByFilters(filters, tenantId);
  }

  async getWithTeamCounts(tenantId: string): Promise<MinistryWithTeam[]> {
    return await this.ministryAdapter.getWithTeamCounts(tenantId);
  }

  async createMinistry(data: MinistryCreateInput, tenantId: string, userId?: string): Promise<Ministry> {
    return await this.ministryAdapter.createMinistry(data, tenantId, userId);
  }

  async updateMinistry(id: string, data: MinistryUpdateInput, tenantId: string, userId?: string): Promise<Ministry> {
    return await this.ministryAdapter.updateMinistry(id, data, tenantId, userId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    return await this.ministryAdapter.softDelete(id, tenantId);
  }
}
