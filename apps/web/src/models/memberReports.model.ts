/**
 * Member Reports Models
 *
 * Domain models for member intelligence reports
 */

export interface MembershipOverviewMetrics {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  visitors: number;
  newThisMonth: number;
  newThisYear: number;
  totalFamilies: number;
  avgFamilySize: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

export interface MembershipStatusBreakdown {
  items: BreakdownItem[];
}

export interface MembershipTypeBreakdown {
  items: BreakdownItem[];
}

export interface GrowthTrendDataPoint {
  monthDate: Date;
  monthLabel: string;
  totalMembers: number;
  newMembers: number;
  departedMembers: number;
  netGrowth: number;
}

export interface MembershipGrowthTrend {
  dataPoints: GrowthTrendDataPoint[];
}

export interface FamilySizeDistribution {
  items: BreakdownItem[];
}

export interface EngagementMetrics {
  totalCarePlans: number;
  activeCarePlans: number;
  membersWithCare: number;
  totalDiscipleshipPlans: number;
  activeDiscipleshipPlans: number;
  membersWithDiscipleship: number;
  membersServing: number;
}

export interface CarePlanPriorityBreakdown {
  items: BreakdownItem[];
}

export interface DiscipleshipPathwayBreakdown {
  items: BreakdownItem[];
}

export interface MembershipCenterDistribution {
  items: BreakdownItem[];
}

export interface MemberReportsData {
  overviewMetrics: MembershipOverviewMetrics;
  statusBreakdown: MembershipStatusBreakdown;
  typeBreakdown: MembershipTypeBreakdown;
  growthTrend: MembershipGrowthTrend;
  familySizeDistribution: FamilySizeDistribution;
  engagementMetrics: EngagementMetrics;
  carePriorityBreakdown: CarePlanPriorityBreakdown;
  discipleshipPathwayBreakdown: DiscipleshipPathwayBreakdown;
  centerDistribution: MembershipCenterDistribution;
}
