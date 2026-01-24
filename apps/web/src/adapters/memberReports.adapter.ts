import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  MembershipOverviewMetrics,
  MembershipStatusBreakdown,
  MembershipTypeBreakdown,
  MembershipGrowthTrend,
  FamilySizeDistribution,
  EngagementMetrics,
  CarePlanPriorityBreakdown,
  DiscipleshipPathwayBreakdown,
  MembershipCenterDistribution,
  AgeDistribution,
  AgeGroupItem,
  BreakdownItem,
  GrowthTrendDataPoint,
} from '@/models/memberReports.model';

export interface IMemberReportsAdapter {
  getOverviewMetrics(tenantId: string): Promise<MembershipOverviewMetrics>;
  getStatusBreakdown(tenantId: string): Promise<MembershipStatusBreakdown>;
  getTypeBreakdown(tenantId: string): Promise<MembershipTypeBreakdown>;
  getGrowthTrend(tenantId: string, months?: number): Promise<MembershipGrowthTrend>;
  getFamilySizeDistribution(tenantId: string): Promise<FamilySizeDistribution>;
  getEngagementMetrics(tenantId: string): Promise<EngagementMetrics>;
  getCarePriorityBreakdown(tenantId: string): Promise<CarePlanPriorityBreakdown>;
  getDiscipleshipPathwayBreakdown(tenantId: string): Promise<DiscipleshipPathwayBreakdown>;
  getCenterDistribution(tenantId: string): Promise<MembershipCenterDistribution>;
  getAgeDistribution(tenantId: string): Promise<AgeDistribution>;
}

@injectable()
export class MemberReportsAdapter extends BaseAdapter<any> implements IMemberReportsAdapter {
  protected tableName = 'members'; // Base table reference
  protected defaultSelect = '*';

  async getOverviewMetrics(tenantId: string): Promise<MembershipOverviewMetrics> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_membership_overview_metrics', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch overview metrics: ${error.message}`);
    }

    return data || {
      totalMembers: 0,
      activeMembers: 0,
      inactiveMembers: 0,
      visitors: 0,
      newThisMonth: 0,
      newThisYear: 0,
      totalFamilies: 0,
      avgFamilySize: 0,
    };
  }

  async getStatusBreakdown(tenantId: string): Promise<MembershipStatusBreakdown> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_membership_status_breakdown', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch status breakdown: ${error.message}`);
    }

    const items: BreakdownItem[] = (data || []).map((item: any) => ({
      label: item.status,
      count: Number(item.count),
      percentage: Number(item.percentage),
    }));

    return { items };
  }

  async getTypeBreakdown(tenantId: string): Promise<MembershipTypeBreakdown> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_membership_type_breakdown', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch type breakdown: ${error.message}`);
    }

    const items: BreakdownItem[] = (data || []).map((item: any) => ({
      label: item.membership_type,
      count: Number(item.count),
      percentage: Number(item.percentage),
    }));

    return { items };
  }

  async getGrowthTrend(tenantId: string, months: number = 12): Promise<MembershipGrowthTrend> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_membership_growth_trend', {
      p_tenant_id: tenantId,
      p_months: months,
    });

    if (error) {
      throw new Error(`Failed to fetch growth trend: ${error.message}`);
    }

    const dataPoints: GrowthTrendDataPoint[] = (data || []).map((item: any) => ({
      monthDate: new Date(item.month_date),
      monthLabel: item.month_label,
      totalMembers: Number(item.total_members),
      newMembers: Number(item.new_members),
      departedMembers: Number(item.departed_members),
      netGrowth: Number(item.net_growth),
    }));

    return { dataPoints };
  }

  async getFamilySizeDistribution(tenantId: string): Promise<FamilySizeDistribution> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_family_size_distribution', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch family size distribution: ${error.message}`);
    }

    const items: BreakdownItem[] = (data || []).map((item: any) => ({
      label: item.family_size,
      count: Number(item.count),
      percentage: Number(item.percentage),
    }));

    return { items };
  }

  async getEngagementMetrics(tenantId: string): Promise<EngagementMetrics> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_engagement_metrics', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch engagement metrics: ${error.message}`);
    }

    return data || {
      totalCarePlans: 0,
      activeCarePlans: 0,
      membersWithCare: 0,
      totalDiscipleshipPlans: 0,
      activeDiscipleshipPlans: 0,
      membersWithDiscipleship: 0,
      membersServing: 0,
    };
  }

  async getCarePriorityBreakdown(tenantId: string): Promise<CarePlanPriorityBreakdown> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_care_plan_priority_breakdown', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch care priority breakdown: ${error.message}`);
    }

    const items: BreakdownItem[] = (data || []).map((item: any) => ({
      label: item.priority,
      count: Number(item.count),
      percentage: Number(item.percentage),
    }));

    return { items };
  }

  async getDiscipleshipPathwayBreakdown(tenantId: string): Promise<DiscipleshipPathwayBreakdown> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_discipleship_pathway_breakdown', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch discipleship pathway breakdown: ${error.message}`);
    }

    const items: BreakdownItem[] = (data || []).map((item: any) => ({
      label: item.pathway,
      count: Number(item.count),
      percentage: Number(item.percentage),
    }));

    return { items };
  }

  async getCenterDistribution(tenantId: string): Promise<MembershipCenterDistribution> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_membership_center_distribution', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch center distribution: ${error.message}`);
    }

    const items: BreakdownItem[] = (data || []).map((item: any) => ({
      label: item.center_name,
      count: Number(item.count),
      percentage: Number(item.percentage),
    }));

    return { items };
  }

  async getAgeDistribution(tenantId: string): Promise<AgeDistribution> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_member_age_distribution', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch age distribution: ${error.message}`);
    }

    const items: AgeGroupItem[] = (data?.items || []).map((item: any) => ({
      ageGroup: item.ageGroup,
      label: item.label,
      minAge: Number(item.minAge),
      maxAge: Number(item.maxAge),
      count: Number(item.count),
      percentage: Number(item.percentage),
    }));

    return {
      items,
      averageAge: Number(data?.averageAge || 0),
      medianAge: Number(data?.medianAge || 0),
      membersWithBirthday: Number(data?.membersWithBirthday || 0),
      membersWithoutBirthday: Number(data?.membersWithoutBirthday || 0),
    };
  }
}
