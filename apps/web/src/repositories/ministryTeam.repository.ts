/**
 * Ministry Team Repository
 *
 * Data access interface for ministry team member records.
 * Delegates database operations to the ministry team adapter.
 *
 * @module planner.ministries
 * @featureCode planner.ministries
 *
 * @permission ministries:view - Required to read team member data
 * @permission ministries:manage - Required to add/update team members
 */
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IMinistryTeamAdapter } from '@/adapters/ministryTeam.adapter';
import type {
  MinistryTeam,
  MinistryTeamWithMember,
  MinistryTeamCreateInput,
  MinistryTeamUpdateInput,
} from '@/models/scheduler/ministryTeam.model';
import { TYPES } from '@/lib/types';

export interface IMinistryTeamRepository extends BaseRepository<MinistryTeam> {
  getByMinistry(ministryId: string, tenantId: string): Promise<MinistryTeamWithMember[]>;
  getByMember(memberId: string, tenantId: string): Promise<MinistryTeam[]>;
  getByMinistryAndMember(ministryId: string, memberId: string, tenantId: string): Promise<MinistryTeam | null>;
  createTeamMember(data: MinistryTeamCreateInput, tenantId: string): Promise<MinistryTeam>;
  updateTeamMember(id: string, data: MinistryTeamUpdateInput, tenantId: string): Promise<MinistryTeam>;
  updateTeamMemberByMinistryAndMember(ministryId: string, memberId: string, data: MinistryTeamUpdateInput, tenantId: string): Promise<MinistryTeam>;
  deleteTeamMember(id: string, tenantId: string): Promise<void>;
  deleteTeamMemberByMinistryAndMember(ministryId: string, memberId: string, tenantId: string): Promise<void>;
}

@injectable()
export class MinistryTeamRepository extends BaseRepository<MinistryTeam> implements IMinistryTeamRepository {
  constructor(@inject(TYPES.IMinistryTeamAdapter) private readonly ministryTeamAdapter: IMinistryTeamAdapter) {
    super(ministryTeamAdapter);
  }

  async getByMinistry(ministryId: string, tenantId: string): Promise<MinistryTeamWithMember[]> {
    return await this.ministryTeamAdapter.getByMinistry(ministryId, tenantId);
  }

  async getByMember(memberId: string, tenantId: string): Promise<MinistryTeam[]> {
    return await this.ministryTeamAdapter.getByMember(memberId, tenantId);
  }

  async getByMinistryAndMember(ministryId: string, memberId: string, tenantId: string): Promise<MinistryTeam | null> {
    return await this.ministryTeamAdapter.getByMinistryAndMember(ministryId, memberId, tenantId);
  }

  async createTeamMember(data: MinistryTeamCreateInput, tenantId: string): Promise<MinistryTeam> {
    return await this.ministryTeamAdapter.createTeamMember(data, tenantId);
  }

  async updateTeamMember(id: string, data: MinistryTeamUpdateInput, tenantId: string): Promise<MinistryTeam> {
    return await this.ministryTeamAdapter.updateTeamMember(id, data, tenantId);
  }

  async updateTeamMemberByMinistryAndMember(ministryId: string, memberId: string, data: MinistryTeamUpdateInput, tenantId: string): Promise<MinistryTeam> {
    return await this.ministryTeamAdapter.updateTeamMemberByMinistryAndMember(ministryId, memberId, data, tenantId);
  }

  async deleteTeamMember(id: string, tenantId: string): Promise<void> {
    return await this.ministryTeamAdapter.deleteTeamMember(id, tenantId);
  }

  async deleteTeamMemberByMinistryAndMember(ministryId: string, memberId: string, tenantId: string): Promise<void> {
    return await this.ministryTeamAdapter.deleteTeamMemberByMinistryAndMember(ministryId, memberId, tenantId);
  }
}
