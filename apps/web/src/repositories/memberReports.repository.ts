import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMemberReportsAdapter } from '@/adapters/memberReports.adapter';
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

export interface IMemberReportsRepository {
  getOverviewMetrics(tenantId: string): Promise<MembershipOverviewMetrics>;
  getStatusBreakdown(tenantId: string): Promise<MembershipStatusBreakdown>;
  getTypeBreakdown(tenantId: string): Promise<MembershipTypeBreakdown>;
  getGrowthTrend(tenantId: string, months?: number): Promise<MembershipGrowthTrend>;
  getFamilySizeDistribution(tenantId: string): Promise<FamilySizeDistribution>;
  getEngagementMetrics(tenantId: string): Promise<EngagementMetrics>;
  getCarePriorityBreakdown(tenantId: string): Promise<CarePlanPriorityBreakdown>;
  getDiscipleshipPathwayBreakdown(tenantId: string): Promise<DiscipleshipPathwayBreakdown>;
  getCenterDistribution(tenantId: string): Promise<MembershipCenterDistribution>;
  getAllReportsData(tenantId: string): Promise<MemberReportsData>;
}

@injectable()
export class MemberReportsRepository implements IMemberReportsRepository {
  constructor(
    @inject(TYPES.IMemberReportsAdapter)
    private adapter: IMemberReportsAdapter
  ) {}

  async getOverviewMetrics(tenantId: string): Promise<MembershipOverviewMetrics> {
    return this.adapter.getOverviewMetrics(tenantId);
  }

  async getStatusBreakdown(tenantId: string): Promise<MembershipStatusBreakdown> {
    return this.adapter.getStatusBreakdown(tenantId);
  }

  async getTypeBreakdown(tenantId: string): Promise<MembershipTypeBreakdown> {
    return this.adapter.getTypeBreakdown(tenantId);
  }

  async getGrowthTrend(tenantId: string, months: number = 12): Promise<MembershipGrowthTrend> {
    return this.adapter.getGrowthTrend(tenantId, months);
  }

  async getFamilySizeDistribution(tenantId: string): Promise<FamilySizeDistribution> {
    return this.adapter.getFamilySizeDistribution(tenantId);
  }

  async getEngagementMetrics(tenantId: string): Promise<EngagementMetrics> {
    return this.adapter.getEngagementMetrics(tenantId);
  }

  async getCarePriorityBreakdown(tenantId: string): Promise<CarePlanPriorityBreakdown> {
    return this.adapter.getCarePriorityBreakdown(tenantId);
  }

  async getDiscipleshipPathwayBreakdown(tenantId: string): Promise<DiscipleshipPathwayBreakdown> {
    return this.adapter.getDiscipleshipPathwayBreakdown(tenantId);
  }

  async getCenterDistribution(tenantId: string): Promise<MembershipCenterDistribution> {
    return this.adapter.getCenterDistribution(tenantId);
  }

  async getAllReportsData(tenantId: string): Promise<MemberReportsData> {
    // Fetch all data in parallel for efficiency
    const [
      overviewMetrics,
      statusBreakdown,
      typeBreakdown,
      growthTrend,
      familySizeDistribution,
      engagementMetrics,
      carePriorityBreakdown,
      discipleshipPathwayBreakdown,
      centerDistribution,
    ] = await Promise.all([
      this.getOverviewMetrics(tenantId),
      this.getStatusBreakdown(tenantId),
      this.getTypeBreakdown(tenantId),
      this.getGrowthTrend(tenantId, 12),
      this.getFamilySizeDistribution(tenantId),
      this.getEngagementMetrics(tenantId),
      this.getCarePriorityBreakdown(tenantId),
      this.getDiscipleshipPathwayBreakdown(tenantId),
      this.getCenterDistribution(tenantId),
    ]);

    return {
      overviewMetrics,
      statusBreakdown,
      typeBreakdown,
      growthTrend,
      familySizeDistribution,
      engagementMetrics,
      carePriorityBreakdown,
      discipleshipPathwayBreakdown,
      centerDistribution,
    };
  }
}
