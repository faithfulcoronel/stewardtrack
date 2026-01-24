/**
 * Member Reports Service Handlers
 *
 * Comprehensive data handlers for leadership member reports
 * Aggregates data from members, families, care plans, and discipleship plans
 *
 * TIMEZONE HANDLING:
 * All date formatting uses the tenant's configured timezone via getTenantTimezone().
 * This ensures dates are displayed in the church's local time, not server time.
 * Example: A church in Manila (Asia/Manila) sees "Jan 2026" even if server is UTC.
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MemberReportsService } from '@/services/MemberReportsService';
import type { ServiceDataSourceHandler } from './types';
import { getTenantTimezone, formatDate } from './datetime-utils';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format percentage with symbol
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// =====================================================
// REPORT HERO HANDLER
// =====================================================

const resolveReportsHero: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get overview metrics (service handles tenant resolution)
  const metrics = await reportsService.getOverviewMetrics();

  return {
    variant: 'stats-panel',
    eyebrow: 'Membership Intelligence',
    headline: 'Comprehensive member insights for strategic leadership',
    description: 'Track growth trends, engagement metrics, family dynamics, and spiritual health across your entire community.',
    metrics: [
      {
        label: 'Total Members',
        value: formatNumber(metrics.totalMembers || 0),
      },
      {
        label: 'Active Members',
        value: formatNumber(metrics.activeMembers || 0),
      },
      {
        label: 'New This Month',
        value: formatNumber(metrics.newThisMonth || 0),
      },
      {
        label: 'Total Families',
        value: formatNumber(metrics.totalFamilies || 0),
      },
    ],
  };
};

// =====================================================
// KEY METRICS HANDLER
// =====================================================

const resolveKeyMetrics: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Fetch both metrics in parallel (service handles tenant resolution)
  const [overviewMetrics, engagementMetrics] = await Promise.all([
    reportsService.getOverviewMetrics(),
    reportsService.getEngagementMetrics(),
  ]);

  const totalMembers = overviewMetrics.totalMembers || 0;
  const activeMembers = overviewMetrics.activeMembers || 0;
  const inactiveMembers = overviewMetrics.inactiveMembers || 0;
  const visitors = overviewMetrics.visitors || 0;
  const newThisMonth = overviewMetrics.newThisMonth || 0;
  const newThisYear = overviewMetrics.newThisYear || 0;
  const membersWithCare = engagementMetrics.membersWithCare || 0;
  const membersWithDiscipleship = engagementMetrics.membersWithDiscipleship || 0;
  const membersServing = engagementMetrics.membersServing || 0;

  // Calculate engagement rate
  const engagementRate = totalMembers > 0
    ? Math.round(((activeMembers + membersServing) / totalMembers) * 100)
    : 0;

  // Calculate care coverage
  const careCoverage = totalMembers > 0
    ? Math.round((membersWithCare / totalMembers) * 100)
    : 0;

  return {
    items: [
      {
        id: 'total-members',
        label: 'Total Members',
        value: totalMembers.toLocaleString(),
        change: `+${newThisYear}`,
        changeLabel: 'this year',
        trend: newThisYear > 0 ? 'up' : 'flat',
        tone: 'informative',
        description: 'All members in the database',
      },
      {
        id: 'active-members',
        label: 'Active Members',
        value: activeMembers.toLocaleString(),
        change: formatPercentage((activeMembers / (totalMembers || 1)) * 100),
        changeLabel: 'of total',
        trend: 'up',
        tone: 'positive',
        description: `${inactiveMembers} inactive, ${visitors} visitors`,
      },
      {
        id: 'new-this-month',
        label: 'New This Month',
        value: newThisMonth.toLocaleString(),
        change: '+' + newThisMonth,
        changeLabel: 'joined recently',
        trend: newThisMonth > 0 ? 'up' : 'flat',
        tone: newThisMonth > 0 ? 'positive' : 'neutral',
        description: `${newThisYear} new members this year`,
      },
      {
        id: 'engagement-rate',
        label: 'Engagement Rate',
        value: formatPercentage(engagementRate),
        change: `${membersServing} serving`,
        changeLabel: 'actively involved',
        trend: engagementRate >= 50 ? 'up' : engagementRate >= 30 ? 'flat' : 'down',
        tone: engagementRate >= 50 ? 'positive' : engagementRate >= 30 ? 'neutral' : 'warning',
        description: 'Members actively engaged in ministry',
      },
      {
        id: 'care-coverage',
        label: 'Care Coverage',
        value: formatPercentage(careCoverage),
        change: `${membersWithCare} members`,
        changeLabel: 'receiving care',
        trend: careCoverage >= 30 ? 'up' : careCoverage >= 15 ? 'flat' : 'down',
        tone: careCoverage >= 30 ? 'positive' : careCoverage >= 15 ? 'neutral' : 'warning',
        description: 'Members with active care plans',
      },
      {
        id: 'discipleship-reach',
        label: 'Discipleship Reach',
        value: membersWithDiscipleship.toLocaleString(),
        change: formatPercentage((membersWithDiscipleship / (totalMembers || 1)) * 100),
        changeLabel: 'of members',
        trend: membersWithDiscipleship > 0 ? 'up' : 'flat',
        tone: membersWithDiscipleship > 0 ? 'positive' : 'neutral',
        description: 'Members in active discipleship pathways',
      },
    ],
  };
};

// =====================================================
// MEMBERSHIP STATUS CHART HANDLER
// =====================================================

const resolveMembershipStatusChart: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get status breakdown (service handles tenant resolution)
  const statusBreakdown = await reportsService.getStatusBreakdown();

  // Transform for chart (access .items array and use .label field)
  const data = (statusBreakdown.items || []).map((item) => ({
    status: item.label.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    count: item.count,
    percentage: item.percentage,
  }));

  return {
    type: 'pie',
    data,
    config: {
      nameKey: 'status',
      valueKey: 'count',
      showLegend: true,
      showPercentage: true,
    },
  };
};

// =====================================================
// MEMBERSHIP TYPE CHART HANDLER
// =====================================================

const resolveMembershipTypeChart: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get type breakdown (service handles tenant resolution)
  const typeBreakdown = await reportsService.getTypeBreakdown();

  // Transform for chart (access .items array and use .label field)
  const data = (typeBreakdown.items || []).map((item) => ({
    type: item.label.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    count: item.count,
    percentage: item.percentage,
  }));

  return {
    type: 'pie',
    data,
    config: {
      nameKey: 'type',
      valueKey: 'count',
      showLegend: true,
      showPercentage: true,
    },
  };
};

// =====================================================
// GROWTH TREND CHART HANDLER
// =====================================================

const resolveGrowthTrendChart: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get tenant timezone for date formatting
  const timezone = await getTenantTimezone();

  // Get growth trend for 12 months (service handles tenant resolution)
  const growthTrend = await reportsService.getGrowthTrend(12);

  // Transform for chart - reformat dates with tenant timezone
  const data = (growthTrend.dataPoints || []).map((item) => ({
    month: formatDate(item.monthDate, timezone, { month: 'short', year: 'numeric' }),
    'Total Members': item.totalMembers,
    'New Members': item.newMembers,
    'Net Growth': item.netGrowth,
  }));

  return {
    type: 'multibar',
    data,
    config: {
      xKey: 'month',
      bars: [
        { key: 'New Members', name: 'New Members', color: 'hsl(142.1 76.2% 36.3%)' },
        { key: 'Net Growth', name: 'Net Growth', color: 'hsl(199 89% 48%)' },
      ],
      yLabel: 'Count',
    },
  };
};

// =====================================================
// FAMILY SIZE DISTRIBUTION CHART HANDLER
// =====================================================

const resolveFamilySizeChart: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get family size distribution (service handles tenant resolution)
  const familySizeDistribution = await reportsService.getFamilySizeDistribution();

  // Transform for chart (access .items array)
  const data = (familySizeDistribution.items || []).map((item) => ({
    size: item.label,
    count: item.count,
    percentage: item.percentage,
  }));

  return {
    type: 'bar',
    data,
    config: {
      xKey: 'size',
      yKey: 'count',
      xLabel: 'Family Size',
      yLabel: 'Number of Families',
    },
  };
};

// =====================================================
// CARE PLAN PRIORITY CHART HANDLER
// =====================================================

const resolveCarePriorityChart: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get care priority breakdown (service handles tenant resolution)
  const priorityBreakdown = await reportsService.getCarePriorityBreakdown();

  // Transform for chart (access .items array)
  const data = (priorityBreakdown.items || []).map((item) => ({
    priority: item.label.charAt(0).toUpperCase() + item.label.slice(1),
    count: item.count,
    percentage: item.percentage,
  }));

  return {
    type: 'bar',
    data,
    config: {
      xKey: 'priority',
      yKey: 'count',
      xLabel: 'Priority Level',
      yLabel: 'Number of Care Plans',
      color: 'hsl(38 92% 50%)',
    },
  };
};

// =====================================================
// DISCIPLESHIP PATHWAY CHART HANDLER
// =====================================================

const resolveDiscipleshipPathwayChart: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get discipleship pathway breakdown (service handles tenant resolution)
  const pathwayBreakdown = await reportsService.getDiscipleshipPathwayBreakdown();

  // Transform for chart (access .items array)
  const data = (pathwayBreakdown.items || []).map((item) => ({
    pathway: item.label,
    count: item.count,
    percentage: item.percentage,
  }));

  return {
    type: 'bar',
    data,
    config: {
      xKey: 'pathway',
      yKey: 'count',
      xLabel: 'Pathway',
      yLabel: 'Number of Plans',
      color: 'hsl(280 87% 65%)',
    },
  };
};

// =====================================================
// MEMBERSHIP CENTER DISTRIBUTION CHART HANDLER
// =====================================================

const resolveCenterDistributionChart: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get center distribution (service handles tenant resolution)
  const centerDistribution = await reportsService.getCenterDistribution();

  // Transform for chart (access .items array)
  const data = (centerDistribution.items || []).map((item) => ({
    center: item.label,
    count: item.count,
    percentage: item.percentage,
  }));

  return {
    type: 'pie',
    data,
    config: {
      nameKey: 'center',
      valueKey: 'count',
      showLegend: true,
      showPercentage: true,
    },
  };
};

// =====================================================
// AGE DISTRIBUTION CHART HANDLER
// =====================================================

const resolveAgeDistributionChart: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get age distribution (service handles tenant resolution)
  const ageDistribution = await reportsService.getAgeDistribution();

  // Transform for chart
  const data = (ageDistribution.items || []).map((item) => ({
    ageGroup: item.label,
    count: item.count,
    percentage: item.percentage,
  }));

  return {
    type: 'bar',
    data,
    config: {
      xKey: 'ageGroup',
      yKey: 'count',
      xLabel: 'Age Group',
      yLabel: 'Number of Members',
      color: 'hsl(262 83% 58%)', // Purple for age groups
    },
    summary: {
      averageAge: ageDistribution.averageAge,
      medianAge: ageDistribution.medianAge,
      membersWithBirthday: ageDistribution.membersWithBirthday,
      membersWithoutBirthday: ageDistribution.membersWithoutBirthday,
    },
  };
};

// =====================================================
// AGE INSIGHTS METRICS HANDLER
// =====================================================

const resolveAgeInsightsMetrics: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get age distribution (service handles tenant resolution)
  const ageDistribution = await reportsService.getAgeDistribution();

  const items = ageDistribution.items || [];
  const totalWithBirthday = ageDistribution.membersWithBirthday || 0;
  const totalWithoutBirthday = ageDistribution.membersWithoutBirthday || 0;
  const totalMembers = totalWithBirthday + totalWithoutBirthday;

  // Find largest age group
  const largestGroup = items.reduce(
    (max, item) => (item.count > max.count ? item : max),
    { label: 'N/A', count: 0, percentage: 0 }
  );

  // Calculate children (0-12), youth (13-17), and adults (18+)
  const childrenCount = items
    .filter((item) => item.maxAge <= 12)
    .reduce((sum, item) => sum + item.count, 0);
  const youthCount = items
    .filter((item) => item.minAge >= 13 && item.maxAge <= 17)
    .reduce((sum, item) => sum + item.count, 0);
  const adultCount = items
    .filter((item) => item.minAge >= 18)
    .reduce((sum, item) => sum + item.count, 0);

  return {
    items: [
      {
        id: 'average-age',
        label: 'Average Age',
        value: ageDistribution.averageAge > 0 ? `${ageDistribution.averageAge.toFixed(1)} yrs` : 'N/A',
        change: `Median: ${ageDistribution.medianAge > 0 ? ageDistribution.medianAge.toFixed(1) : 'N/A'}`,
        changeLabel: 'years',
        trend: 'flat',
        tone: 'informative',
        description: `Based on ${totalWithBirthday} members with birthdays`,
      },
      {
        id: 'largest-group',
        label: 'Largest Age Group',
        value: largestGroup.label || 'N/A',
        change: `${largestGroup.count} members`,
        changeLabel: `${largestGroup.percentage.toFixed(1)}%`,
        trend: 'flat',
        tone: 'informative',
        description: 'Most represented age demographic',
      },
      {
        id: 'children-count',
        label: 'Children (0-12)',
        value: childrenCount.toLocaleString(),
        change: formatPercentage((childrenCount / (totalWithBirthday || 1)) * 100),
        changeLabel: 'of members',
        trend: childrenCount > 0 ? 'up' : 'flat',
        tone: childrenCount > 0 ? 'positive' : 'neutral',
        description: 'Nursery through Juniors',
      },
      {
        id: 'youth-count',
        label: 'Youth (13-17)',
        value: youthCount.toLocaleString(),
        change: formatPercentage((youthCount / (totalWithBirthday || 1)) * 100),
        changeLabel: 'of members',
        trend: youthCount > 0 ? 'up' : 'flat',
        tone: youthCount > 0 ? 'positive' : 'neutral',
        description: 'Teenagers and high schoolers',
      },
      {
        id: 'adults-count',
        label: 'Adults (18+)',
        value: adultCount.toLocaleString(),
        change: formatPercentage((adultCount / (totalWithBirthday || 1)) * 100),
        changeLabel: 'of members',
        trend: adultCount > 0 ? 'up' : 'flat',
        tone: adultCount > 0 ? 'positive' : 'neutral',
        description: 'Young adults through seniors',
      },
      {
        id: 'missing-birthday',
        label: 'Missing Birthdays',
        value: totalWithoutBirthday.toLocaleString(),
        change: formatPercentage((totalWithoutBirthday / (totalMembers || 1)) * 100),
        changeLabel: 'of total',
        trend: totalWithoutBirthday > 0 ? 'down' : 'flat',
        tone: totalWithoutBirthday > 0 ? 'warning' : 'positive',
        description: 'Members without birthday data',
      },
    ],
  };
};

// =====================================================
// ENGAGEMENT SUMMARY HANDLER
// =====================================================

const resolveEngagementSummary: ServiceDataSourceHandler = async (_request) => {
  // Get member reports service
  const reportsService = container.get<MemberReportsService>(TYPES.MemberReportsService);

  // Get engagement metrics (service handles tenant resolution)
  const engagementMetrics = await reportsService.getEngagementMetrics();

  return {
    items: [
      {
        id: 'active-care-plans',
        label: 'Active Care Plans',
        value: engagementMetrics.activeCarePlans?.toLocaleString() || '0',
        change: `${engagementMetrics.membersWithCare || 0} members`,
        changeLabel: 'receiving care',
        trend: 'flat',
        tone: 'informative',
        description: `${engagementMetrics.totalCarePlans || 0} total care plans`,
      },
      {
        id: 'active-discipleship',
        label: 'Active Discipleship',
        value: engagementMetrics.activeDiscipleshipPlans?.toLocaleString() || '0',
        change: `${engagementMetrics.membersWithDiscipleship || 0} members`,
        changeLabel: 'being discipled',
        trend: 'up',
        tone: 'positive',
        description: `${engagementMetrics.totalDiscipleshipPlans || 0} total plans`,
      },
      {
        id: 'members-serving',
        label: 'Members Serving',
        value: engagementMetrics.membersServing?.toLocaleString() || '0',
        change: '',
        changeLabel: 'active in ministry',
        trend: 'up',
        tone: 'positive',
        description: 'Members with active serving assignments',
      },
    ],
  };
};

// =====================================================
// COMPOSITE CHART HANDLERS
// =====================================================

/**
 * Membership Charts - Combines status and type distribution charts
 */
const resolveMembershipCharts: ServiceDataSourceHandler = async (request) => {
  const [statusChart, typeChart] = await Promise.all([
    resolveMembershipStatusChart(request),
    resolveMembershipTypeChart(request),
  ]);

  return {
    charts: [
      {
        ...(statusChart as object),
        title: 'Membership Status Distribution',
        description: 'Breakdown of members by current status',
      },
      {
        ...(typeChart as object),
        title: 'Membership Type Distribution',
        description: 'Distribution by membership type',
      },
    ],
  };
};

/**
 * Growth Trend Charts - Wraps growth trend chart in array
 */
const resolveGrowthTrendCharts: ServiceDataSourceHandler = async (request) => {
  const growthChart = await resolveGrowthTrendChart(request);

  return {
    charts: [
      {
        ...(growthChart as object),
        title: 'Monthly Membership Growth',
        description: 'Track new members and net growth over the past 12 months',
      },
    ],
  };
};

/**
 * Family Insights Charts - Wraps family size chart in array
 */
const resolveFamilyInsightsCharts: ServiceDataSourceHandler = async (request) => {
  const familySizeChart = await resolveFamilySizeChart(request);

  return {
    charts: [
      {
        ...(familySizeChart as object),
        title: 'Family Size Distribution',
        description: 'Number of families by household size',
      },
    ],
  };
};

/**
 * Engagement Charts - Combines care priority and discipleship pathway charts
 */
const resolveEngagementCharts: ServiceDataSourceHandler = async (request) => {
  const [carePriorityChart, discipleshipChart] = await Promise.all([
    resolveCarePriorityChart(request),
    resolveDiscipleshipPathwayChart(request),
  ]);

  return {
    charts: [
      {
        ...(carePriorityChart as object),
        title: 'Care Plan Priority Breakdown',
        description: 'Active care plans by priority level',
      },
      {
        ...(discipleshipChart as object),
        title: 'Discipleship Pathway Distribution',
        description: 'Members by discipleship pathway',
      },
    ],
  };
};

/**
 * Center Distribution Charts - Wraps center distribution chart in array
 */
const resolveCenterDistributionCharts: ServiceDataSourceHandler = async (request) => {
  const centerChart = await resolveCenterDistributionChart(request);

  return {
    charts: [
      {
        ...(centerChart as object),
        title: 'Members by Campus/Center',
        description: 'Distribution across membership centers',
      },
    ],
  };
};

/**
 * Age Insights Charts - Wraps age distribution chart in array
 */
const resolveAgeInsightsCharts: ServiceDataSourceHandler = async (request) => {
  const ageChart = await resolveAgeDistributionChart(request);

  return {
    charts: [
      {
        ...(ageChart as object),
        title: 'Age Group Distribution',
        description: 'Member distribution across church age groups (Nursery through Seniors)',
      },
    ],
  };
};

// =====================================================
// EXPORT HANDLERS
// =====================================================

export const adminCommunityReportsHandlers: Record<string, ServiceDataSourceHandler> = {
  'admin-community.reports.hero': resolveReportsHero,
  'admin-community.reports.keyMetrics': resolveKeyMetrics,
  'admin-community.reports.membershipStatusChart': resolveMembershipStatusChart,
  'admin-community.reports.membershipTypeChart': resolveMembershipTypeChart,
  'admin-community.reports.growthTrendChart': resolveGrowthTrendChart,
  'admin-community.reports.familySizeChart': resolveFamilySizeChart,
  'admin-community.reports.carePriorityChart': resolveCarePriorityChart,
  'admin-community.reports.discipleshipPathwayChart': resolveDiscipleshipPathwayChart,
  'admin-community.reports.centerDistributionChart': resolveCenterDistributionChart,
  'admin-community.reports.engagementSummary': resolveEngagementSummary,
  'admin-community.reports.ageDistributionChart': resolveAgeDistributionChart,
  'admin-community.reports.ageInsightsMetrics': resolveAgeInsightsMetrics,
  // Composite chart handlers
  'admin-community.reports.membershipCharts': resolveMembershipCharts,
  'admin-community.reports.growthTrendCharts': resolveGrowthTrendCharts,
  'admin-community.reports.familyInsightsCharts': resolveFamilyInsightsCharts,
  'admin-community.reports.engagementCharts': resolveEngagementCharts,
  'admin-community.reports.centerDistributionCharts': resolveCenterDistributionCharts,
  'admin-community.reports.ageInsightsCharts': resolveAgeInsightsCharts,
};
