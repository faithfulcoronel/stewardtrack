import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import type { IMinistryRepository } from '@/repositories/ministry.repository';
import type { IMinistryTeamRepository } from '@/repositories/ministryTeam.repository';
import type {
  Ministry,
  MinistryWithLeader,
  MinistryWithTeam,
  MinistryCreateInput,
  MinistryUpdateInput,
  MinistryFilters,
  MinistryView,
  MinistryCategory,
} from '@/models/scheduler/ministry.model';
import type {
  MinistryTeam,
  MinistryTeamWithMember,
  MinistryTeamCreateInput,
  MinistryTeamUpdateInput,
} from '@/models/scheduler/ministryTeam.model';

const CATEGORY_LABELS: Record<MinistryCategory, string> = {
  worship: 'Worship',
  education: 'Education',
  outreach: 'Outreach',
  fellowship: 'Fellowship',
  support: 'Support Services',
  general: 'General',
};

export interface IMinistryService {
  // Ministry CRUD
  getAll(tenantId?: string): Promise<Ministry[]>;
  getById(id: string, tenantId?: string): Promise<MinistryWithLeader | null>;
  getByCode(code: string, tenantId?: string): Promise<Ministry | null>;
  getByFilters(filters: MinistryFilters, tenantId?: string): Promise<Ministry[]>;
  getWithTeamCounts(tenantId?: string): Promise<MinistryWithTeam[]>;
  createMinistry(data: MinistryCreateInput, tenantId?: string, userId?: string): Promise<Ministry>;
  updateMinistry(id: string, data: MinistryUpdateInput, tenantId?: string, userId?: string): Promise<Ministry>;
  deleteMinistry(id: string, tenantId?: string): Promise<void>;

  // Team Management
  getTeam(ministryId: string, tenantId?: string): Promise<MinistryTeamWithMember[]>;
  getMemberMinistries(memberId: string, tenantId?: string): Promise<MinistryTeam[]>;
  addTeamMember(data: MinistryTeamCreateInput, tenantId?: string): Promise<MinistryTeam>;
  updateTeamMember(id: string, data: MinistryTeamUpdateInput, tenantId?: string): Promise<MinistryTeam>;
  removeTeamMember(id: string, tenantId?: string): Promise<void>;
  isMemberInTeam(ministryId: string, memberId: string, tenantId?: string): Promise<boolean>;

  // View Transformation
  toMinistryView(ministry: MinistryWithTeam): MinistryView;
  toMinistryViewList(ministries: MinistryWithTeam[]): MinistryView[];
}

@injectable()
export class MinistryService implements IMinistryService {
  constructor(
    @inject(TYPES.IMinistryRepository) private ministryRepository: IMinistryRepository,
    @inject(TYPES.IMinistryTeamRepository) private ministryTeamRepository: IMinistryTeamRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  // ==================== Ministry CRUD ====================

  async getAll(tenantId?: string): Promise<Ministry[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryRepository.getAll(effectiveTenantId);
  }

  async getById(id: string, tenantId?: string): Promise<MinistryWithLeader | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryRepository.getById(id, effectiveTenantId);
  }

  async getByCode(code: string, tenantId?: string): Promise<Ministry | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryRepository.getByCode(code, effectiveTenantId);
  }

  async getByFilters(filters: MinistryFilters, tenantId?: string): Promise<Ministry[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryRepository.getByFilters(filters, effectiveTenantId);
  }

  async getWithTeamCounts(tenantId?: string): Promise<MinistryWithTeam[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryRepository.getWithTeamCounts(effectiveTenantId);
  }

  async createMinistry(data: MinistryCreateInput, tenantId?: string, userId?: string): Promise<Ministry> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Validate unique code
    const existing = await this.ministryRepository.getByCode(data.code, effectiveTenantId);
    if (existing) {
      throw new Error(`Ministry with code '${data.code}' already exists`);
    }

    return await this.ministryRepository.createMinistry(data, effectiveTenantId, userId);
  }

  async updateMinistry(id: string, data: MinistryUpdateInput, tenantId?: string, userId?: string): Promise<Ministry> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Validate code uniqueness if updating
    if (data.code) {
      const existing = await this.ministryRepository.getByCode(data.code, effectiveTenantId);
      if (existing && existing.id !== id) {
        throw new Error(`Ministry with code '${data.code}' already exists`);
      }
    }

    return await this.ministryRepository.updateMinistry(id, data, effectiveTenantId, userId);
  }

  async deleteMinistry(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryRepository.softDelete(id, effectiveTenantId);
  }

  // ==================== Team Management ====================

  async getTeam(ministryId: string, tenantId?: string): Promise<MinistryTeamWithMember[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryTeamRepository.getByMinistry(ministryId, effectiveTenantId);
  }

  async getMemberMinistries(memberId: string, tenantId?: string): Promise<MinistryTeam[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryTeamRepository.getByMember(memberId, effectiveTenantId);
  }

  async addTeamMember(data: MinistryTeamCreateInput, tenantId?: string): Promise<MinistryTeam> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Check if member is already in team
    const existing = await this.ministryTeamRepository.getByMinistryAndMember(
      data.ministry_id,
      data.member_id,
      effectiveTenantId
    );
    if (existing) {
      throw new Error('Member is already part of this ministry team');
    }

    return await this.ministryTeamRepository.createTeamMember(data, effectiveTenantId);
  }

  async updateTeamMember(id: string, data: MinistryTeamUpdateInput, tenantId?: string): Promise<MinistryTeam> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryTeamRepository.updateTeamMember(id, data, effectiveTenantId);
  }

  async removeTeamMember(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.ministryTeamRepository.deleteTeamMember(id, effectiveTenantId);
  }

  async isMemberInTeam(ministryId: string, memberId: string, tenantId?: string): Promise<boolean> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const membership = await this.ministryTeamRepository.getByMinistryAndMember(
      ministryId,
      memberId,
      effectiveTenantId
    );
    return membership !== null;
  }

  // ==================== View Transformation ====================

  toMinistryView(ministry: MinistryWithTeam): MinistryView {
    const leaderName = ministry.leader
      ? `${ministry.leader.first_name} ${ministry.leader.last_name}`
      : null;

    return {
      id: ministry.id,
      name: ministry.name,
      code: ministry.code,
      description: ministry.description,
      category: ministry.category,
      categoryLabel: CATEGORY_LABELS[ministry.category],
      leaderName,
      color: ministry.color,
      icon: ministry.icon,
      isActive: ministry.is_active,
      teamCount: ministry.team_count,
      scheduleCount: ministry.schedule_count,
    };
  }

  toMinistryViewList(ministries: MinistryWithTeam[]): MinistryView[] {
    return ministries.map(m => this.toMinistryView(m));
  }
}
