/**
 * Dashboard Data Service Handlers
 *
 * Provides real-time data for the membership dashboard components.
 * Replaces static dummy data with actual database queries.
 *
 * Uses the DI container to properly resolve services with all dependencies.
 */

import { format, subMonths } from 'date-fns';

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MembersDashboardService } from '@/services/MembersDashboardService';
import type { MemberCarePlanService } from '@/services/MemberCarePlanService';
import type { MemberDiscipleshipPlanService } from '@/services/MemberDiscipleshipPlanService';
import type { MemberDiscipleshipMilestoneService } from '@/services/MemberDiscipleshipMilestoneService';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import { tenantUtils } from '@/utils/tenantUtils';

import type { ServiceDataSourceHandler, ServiceDataSourceRequest } from './types';
import { getTenantTimezone, formatDate, formatRelativeTime } from './datetime-utils';

// Handler IDs for dashboard components
const DASHBOARD_HERO_HANDLER_ID = 'admin-community.dashboard.hero';
const DASHBOARD_KPIS_HANDLER_ID = 'admin-community.dashboard.kpis';
const DASHBOARD_QUICK_LINKS_HANDLER_ID = 'admin-community.dashboard.quickLinks';
const DASHBOARD_GIVING_TREND_HANDLER_ID = 'admin-community.dashboard.givingTrend';
const DASHBOARD_CARE_TIMELINE_HANDLER_ID = 'admin-community.dashboard.careTimeline';

/**
 * Get services from DI container - proper dependency injection pattern
 */
function getMembersDashboardService(): MembersDashboardService {
  return container.get<MembersDashboardService>(TYPES.MembersDashboardService);
}

function getCarePlanService(): MemberCarePlanService {
  return container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
}

function getDiscipleshipPlanService(): MemberDiscipleshipPlanService {
  return container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
}

function getDiscipleshipMilestoneService(): MemberDiscipleshipMilestoneService {
  return container.get<MemberDiscipleshipMilestoneService>(TYPES.MemberDiscipleshipMilestoneService);
}

/**
 * Dashboard Hero Handler
 * Provides headline metrics and messaging for the hero section
 */
async function resolveDashboardHero(
  _request: ServiceDataSourceRequest
): Promise<{
  eyebrow: string;
  headline: string;
  description: string;
  highlights: string[];
  metrics: Array<{ label: string; value: string; caption: string }>;
  image: { src: string; alt: string } | null;
}> {
  const service = getMembersDashboardService();
  const metrics = await service.getMetrics();
  const carePlanService = getCarePlanService();
  const carePlanStats = await carePlanService.getCarePlanStats();

  // Get tenant's church image URL
  let churchImageUrl: string | null = null;
  let tenantName = 'Church';
  try {
    const tenantId = await tenantUtils.getTenantId();
    if (tenantId) {
      const tenantRepo = container.get<ITenantRepository>(TYPES.ITenantRepository);
      const tenant = await tenantRepo.findById(tenantId);
      if (tenant) {
        churchImageUrl = tenant.church_image_url ?? null;
        tenantName = tenant.name || 'Church';
      }
    }
  } catch (error) {
    console.error('[Dashboard Hero] Error fetching tenant:', error);
  }

  // Format real metrics
  const totalFamilies = metrics.familyCount || 0;
  const engagementRate = metrics.totalMembers > 0
    ? Math.round((metrics.totalMembers - (metrics.visitorCount || 0)) / metrics.totalMembers * 100)
    : 0;

  return {
    eyebrow: 'Community health pulse',
    headline: 'Shepherd every family with real-time ministry insight',
    description: 'Monitor membership vitality, giving momentum, and care commitments across all centers in one workspace.',
    highlights: [
      'Map the journey from first-time guests to covenant members with automated stage tracking.',
      'Surface families at financial risk before pledges lapse and route them to center pastors.',
      'Keep every ministry aligned with dashboards tailored for elders, finance teams, and care leads.',
    ],
    metrics: [
      {
        label: 'Active families',
        value: totalFamilies.toLocaleString(),
        caption: `${engagementRate}% engaged over the last 30 days.`,
      },
      {
        label: 'New this month',
        value: (metrics.newMembers || 0).toLocaleString(),
        caption: 'New members joined this month.',
      },
      {
        label: 'Care plans',
        value: (carePlanStats.active || 0).toLocaleString(),
        caption: 'Active pastoral follow-up sequences.',
      },
    ],
    image: churchImageUrl ? { src: churchImageUrl, alt: `${tenantName} church building` } : null,
  };
}

/**
 * Dashboard KPIs Handler
 * Provides ministry KPI cards with real data
 */
async function resolveDashboardKpis(
  _request: ServiceDataSourceRequest
): Promise<{
  items: Array<{
    id: string;
    label: string;
    value: string;
    change: string;
    changeLabel: string;
    trend: 'up' | 'down' | 'flat';
    tone: 'positive' | 'negative' | 'neutral' | 'informative';
    description: string;
  }>;
}> {
  const service = getMembersDashboardService();
  const metrics = await service.getMetrics();
  const carePlanService = getCarePlanService();
  const carePlanStats = await carePlanService.getCarePlanStats();

  return {
    items: [
      {
        id: 'kpi-new-members',
        label: 'New covenant members',
        value: (metrics.newMembers || 0).toString(),
        change: metrics.newMembers > 0 ? `+${metrics.newMembers}` : '0',
        changeLabel: 'this month',
        trend: metrics.newMembers > 0 ? 'up' : 'flat',
        tone: metrics.newMembers > 0 ? 'positive' : 'neutral',
        description: `${metrics.familyCount || 0} families in the community.`,
      },
      {
        id: 'kpi-visitors',
        label: 'First-time visitors',
        value: (metrics.visitorCount || 0).toString(),
        change: metrics.visitorCount > 0 ? `+${metrics.visitorCount}` : '0',
        changeLabel: 'this month',
        trend: metrics.visitorCount > 0 ? 'up' : 'flat',
        tone: metrics.visitorCount > 0 ? 'informative' : 'neutral',
        description: 'New visitors being welcomed and connected.',
      },
      {
        id: 'kpi-total-members',
        label: 'Total members',
        value: (metrics.totalMembers || 0).toLocaleString(),
        change: '',
        changeLabel: 'active records',
        trend: 'flat',
        tone: 'informative',
        description: 'All active members in the database.',
      },
      {
        id: 'kpi-care-plans',
        label: 'Active care plans',
        value: (carePlanStats.active || 0).toString(),
        change: carePlanStats.urgent > 0 ? `${carePlanStats.urgent} urgent` : '',
        changeLabel: 'requiring attention',
        trend: carePlanStats.urgent > 0 ? 'up' : 'flat',
        tone: carePlanStats.urgent > 0 ? 'negative' : 'neutral',
        description: `${carePlanStats.pending || 0} care plans pending review.`,
      },
    ],
  };
}

/**
 * Dashboard Quick Links Handler
 * Provides navigation links with real statistics
 */
async function resolveDashboardQuickLinks(
  _request: ServiceDataSourceRequest
): Promise<{
  items: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    badge: string;
    stat: string;
  }>;
  actions: Array<{
    id: string;
    kind: string;
    config: { label: string; url: string; variant: string };
  }>;
}> {
  const service = getMembersDashboardService();
  const metrics = await service.getMetrics();
  const carePlanService = getCarePlanService();
  const carePlanStats = await carePlanService.getCarePlanStats();

  return {
    items: [
      {
        id: 'link-directory',
        title: 'Membership directory',
        description: 'Filter members, stages, and pastoral assignments to steward discipleship.',
        href: '/admin/members/list',
        badge: 'Directory',
        stat: `${(metrics.totalMembers || 0).toLocaleString()} active members`,
      },
      {
        id: 'link-families',
        title: 'Family directory',
        description: 'Manage family records, members, and addresses.',
        href: '/admin/community/families/list',
        badge: 'Families',
        stat: `${(metrics.familyCount || 0).toLocaleString()} families`,
      },
      {
        id: 'link-care',
        title: 'Care follow-ups',
        description: 'Prioritize counseling, hospital visits, and pastoral requests across centers.',
        href: '/admin/community/care-plans/list',
        badge: 'Shepherding',
        stat: `${carePlanStats.active || 0} active care plans`,
      },
      {
        id: 'link-new-member',
        title: 'Add new member',
        description: 'Register a new member with full profile, family, and care plan setup.',
        href: '/admin/members/manage',
        badge: 'Quick Action',
        stat: `${metrics.newMembers || 0} new this month`,
      },
    ],
    actions: [
      {
        id: 'action-view-all',
        kind: 'link',
        config: {
          label: 'View all members',
          url: '/admin/members/list',
          variant: 'secondary',
        },
      },
    ],
  };
}

/**
 * Dashboard Giving Trend Handler
 * Provides placeholder giving data (requires finance module integration)
 */
async function resolveDashboardGivingTrend(
  _request: ServiceDataSourceRequest
): Promise<{
  highlight: { label: string; value: string; change: string };
  points: Array<{
    period: string;
    pledged: number;
    received: number;
    participation: number;
  }>;
}> {
  // Note: This requires integration with the finance module
  // For now, return empty state indicating no data available
  const currentMonth = new Date();
  const months: Array<{
    period: string;
    pledged: number;
    received: number;
    participation: number;
  }> = [];

  // Generate last 6 months as empty placeholders
  for (let i = 5; i >= 0; i--) {
    const month = subMonths(currentMonth, i);
    months.push({
      period: format(month, 'MMM'),
      pledged: 0,
      received: 0,
      participation: 0,
    });
  }

  return {
    highlight: {
      label: 'FY YTD',
      value: 'No giving data',
      change: 'Connect finance module',
    },
    points: months,
  };
}

/**
 * Dashboard Care Timeline Handler
 * Provides recent care milestones and discipleship events
 */
async function resolveDashboardCareTimeline(
  _request: ServiceDataSourceRequest
): Promise<{
  items: Array<{
    id: string;
    title: string;
    date: string;
    timeAgo: string;
    description: string;
    category: string;
    status: 'completed' | 'scheduled' | 'attention' | 'new';
    icon: string;
  }>;
}> {
  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const carePlanService = getCarePlanService();
  const discipleshipPlanService = getDiscipleshipPlanService();
  const milestoneService = getDiscipleshipMilestoneService();

  try {
    // Fetch care plans, discipleship plans, and milestones
    const [recentCarePlans, recentDiscipleshipPlans, recentMilestones] = await Promise.all([
      carePlanService.getRecentCarePlans(5),
      discipleshipPlanService.getRecentPlans(5),
      milestoneService.getRecentMilestones(5),
    ]);

    // Map care plans to timeline items
    const careItems = (recentCarePlans || []).map((plan, index) => ({
      id: plan.id || `care-${index}`,
      title: plan.title || 'Care plan update',
      date: plan.created_at ? formatDate(new Date(plan.created_at), timezone, { month: 'short', day: 'numeric' }) : '',
      timeAgo: plan.created_at
        ? formatRelativeTime(new Date(plan.created_at), timezone)
        : '',
      description: plan.description || 'Care follow-up in progress.',
      category: plan.priority === 'urgent' ? 'Urgent' : 'Care',
      status: (plan.status === 'active' ? 'attention' : plan.status === 'completed' ? 'completed' : 'new') as 'completed' | 'scheduled' | 'attention' | 'new',
      icon: plan.priority === 'urgent' ? '🔴' : '💙',
      sortDate: plan.created_at ? new Date(plan.created_at).getTime() : 0,
    }));

    // Map discipleship plans to timeline items
    const discipleshipItems = (recentDiscipleshipPlans || []).map((plan, index) => {
      const pathwayLabel = plan.pathway
        ? plan.pathway.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Discipleship';
      const description = plan.nextStep
        ? `Next step: ${plan.nextStep}`
        : plan.mentorName
          ? `Mentor: ${plan.mentorName}`
          : 'Discipleship journey in progress.';

      return {
        id: plan.id || `discipleship-${index}`,
        title: `${pathwayLabel} plan`,
        date: plan.createdAt ? formatDate(new Date(plan.createdAt), timezone, { month: 'short', day: 'numeric' }) : '',
        timeAgo: plan.createdAt
          ? formatRelativeTime(new Date(plan.createdAt), timezone)
          : '',
        description,
        category: 'Discipleship',
        status: (plan.status === 'completed' ? 'completed' : plan.status === 'active' ? 'scheduled' : 'new') as 'completed' | 'scheduled' | 'attention' | 'new',
        icon: '📖',
        sortDate: plan.createdAt ? new Date(plan.createdAt).getTime() : 0,
      };
    });

    // Map milestones to timeline items
    const milestoneItems = (recentMilestones || []).map((milestone, index) => {
      const isCelebrated = !!milestone.celebratedAt;
      const milestoneDate = milestone.milestoneDate || milestone.createdAt;

      return {
        id: milestone.id || `milestone-${index}`,
        title: milestone.name || 'Milestone reached',
        date: milestoneDate ? formatDate(new Date(milestoneDate), timezone, { month: 'short', day: 'numeric' }) : '',
        timeAgo: milestoneDate
          ? formatRelativeTime(new Date(milestoneDate), timezone)
          : '',
        description: milestone.description || 'Discipleship milestone achieved.',
        category: 'Milestone',
        status: (isCelebrated ? 'completed' : 'new') as 'completed' | 'scheduled' | 'attention' | 'new',
        icon: isCelebrated ? '🎉' : '🏆',
        sortDate: milestoneDate ? new Date(milestoneDate).getTime() : 0,
      };
    });

    // Merge and sort by date (most recent first)
    const allItems = [...careItems, ...discipleshipItems, ...milestoneItems]
      .sort((a, b) => b.sortDate - a.sortDate)
      .slice(0, 10)
      .map(({ sortDate: _sortDate, ...item }) => item);

    if (allItems.length === 0) {
      return {
        items: [
          {
            id: 'empty-state',
            title: 'No recent activity',
            date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
            timeAgo: 'Today',
            description: 'Care, discipleship, and milestone events will appear here as activities are logged.',
            category: 'Info',
            status: 'new',
            icon: '📋',
          },
        ],
      };
    }

    return { items: allItems };
  } catch (error) {
    console.error('[Dashboard] Error fetching care timeline:', error);
    return {
      items: [
        {
          id: 'error-state',
          title: 'Unable to load timeline',
          date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
          timeAgo: 'Now',
          description: 'There was an error loading the timeline. Please try refreshing.',
          category: 'Error',
          status: 'attention',
          icon: '⚠️',
        },
      ],
    };
  }
}

export const adminCommunityDashboardHandlers: Record<string, ServiceDataSourceHandler> = {
  [DASHBOARD_HERO_HANDLER_ID]: resolveDashboardHero,
  [DASHBOARD_KPIS_HANDLER_ID]: resolveDashboardKpis,
  [DASHBOARD_QUICK_LINKS_HANDLER_ID]: resolveDashboardQuickLinks,
  [DASHBOARD_GIVING_TREND_HANDLER_ID]: resolveDashboardGivingTrend,
  [DASHBOARD_CARE_TIMELINE_HANDLER_ID]: resolveDashboardCareTimeline,
};
