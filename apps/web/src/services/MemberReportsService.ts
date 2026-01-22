import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMemberReportsRepository } from '@/repositories/memberReports.repository';
import type {
  MemberReportsData,
  MembershipOverviewMetrics,
  MembershipStatusBreakdown,
  MembershipTypeBreakdown,
  MembershipGrowthTrend,
  FamilySizeDistribution,
  EngagementMetrics,
  CarePlanPriorityBreakdown,
  DiscipleshipPathwayBreakdown,
  MembershipCenterDistribution,
} from '@/models/memberReports.model';
import { tenantUtils } from '@/utils/tenantUtils';

@injectable()
export class MemberReportsService {
  constructor(
    @inject(TYPES.IMemberReportsRepository)
    private repository: IMemberReportsRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  async getOverviewMetrics(tenantId?: string): Promise<MembershipOverviewMetrics> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getOverviewMetrics(resolvedTenantId);
  }

  async getStatusBreakdown(tenantId?: string): Promise<MembershipStatusBreakdown> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getStatusBreakdown(resolvedTenantId);
  }

  async getTypeBreakdown(tenantId?: string): Promise<MembershipTypeBreakdown> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getTypeBreakdown(resolvedTenantId);
  }

  async getGrowthTrend(months: number = 12, tenantId?: string): Promise<MembershipGrowthTrend> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getGrowthTrend(resolvedTenantId, months);
  }

  async getFamilySizeDistribution(tenantId?: string): Promise<FamilySizeDistribution> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getFamilySizeDistribution(resolvedTenantId);
  }

  async getEngagementMetrics(tenantId?: string): Promise<EngagementMetrics> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getEngagementMetrics(resolvedTenantId);
  }

  async getCarePriorityBreakdown(tenantId?: string): Promise<CarePlanPriorityBreakdown> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getCarePriorityBreakdown(resolvedTenantId);
  }

  async getDiscipleshipPathwayBreakdown(tenantId?: string): Promise<DiscipleshipPathwayBreakdown> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getDiscipleshipPathwayBreakdown(resolvedTenantId);
  }

  async getCenterDistribution(tenantId?: string): Promise<MembershipCenterDistribution> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getCenterDistribution(resolvedTenantId);
  }

  async getAllReportsData(tenantId?: string): Promise<MemberReportsData> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.repository.getAllReportsData(resolvedTenantId);
  }
}
