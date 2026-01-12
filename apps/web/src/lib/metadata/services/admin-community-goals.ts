import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { IGoalsService } from '@/services/goals';
import type { GoalCategoryService } from '@/services/goals/GoalCategoryService';
import type { MembersDashboardService } from '@/services/MembersDashboardService';
import type { Goal, GoalStatus } from '@/models/goals';
import { getTenantTimezone, formatDate } from './datetime-utils';

// ==================== GOALS PAGE HANDLERS ====================

/**
 * Resolve hero section data for goals page
 */
const resolveGoalsHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const stats = await goalsService.getDashboardStats();

  return {
    eyebrow: 'Strategic planning · Goals module',
    headline: 'Goals & Objectives',
    description: 'Set church-wide strategic goals, track ministry objectives, and measure key results with progress updates.',
    metrics: [
      {
        label: 'Total goals',
        value: String(stats.total_goals),
        caption: 'Active strategic goals',
      },
      {
        label: 'On track',
        value: String(stats.goals_by_status.on_track),
        caption: 'Goals progressing well',
      },
      {
        label: 'Avg progress',
        value: `${Math.round(stats.average_progress)}%`,
        caption: 'Across all goals',
      },
    ],
  };
};

/**
 * Resolve KPI metrics for goals page
 */
const resolveGoalsMetrics: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const stats = await goalsService.getDashboardStats();

  const total = stats.total_goals || 1; // Avoid division by zero

  // Count "healthy" goals: on_track + active (active goals are in progress but haven't been evaluated yet)
  const healthyCount = stats.goals_by_status.on_track + stats.goals_by_status.active;

  // Build the items array - include draft only if there are draft goals
  const items = [
    {
      id: 'metric-on-track',
      label: 'On track',
      value: String(healthyCount),
      change: `${Math.round((healthyCount / total) * 100)}%`,
      changeLabel: 'of total',
      trend: 'up' as const,
      tone: 'positive' as const,
      description: 'Goals progressing as planned toward their targets.',
    },
    {
      id: 'metric-at-risk',
      label: 'At risk',
      value: String(stats.goals_by_status.at_risk),
      change: `${Math.round((stats.goals_by_status.at_risk / total) * 100)}%`,
      changeLabel: 'of total',
      trend: stats.goals_by_status.at_risk > 0 ? 'down' as const : 'flat' as const,
      tone: stats.goals_by_status.at_risk > 0 ? 'warning' as const : 'neutral' as const,
      description: 'Goals that may not meet their targets without intervention.',
    },
    {
      id: 'metric-behind',
      label: 'Behind schedule',
      value: String(stats.goals_by_status.behind),
      change: `${Math.round((stats.goals_by_status.behind / total) * 100)}%`,
      changeLabel: 'of total',
      trend: stats.goals_by_status.behind > 0 ? 'down' as const : 'flat' as const,
      tone: stats.goals_by_status.behind > 0 ? 'warning' as const : 'neutral' as const,
      description: 'Goals that are significantly behind their expected progress.',
    },
    {
      id: 'metric-completed',
      label: 'Completed',
      value: String(stats.goals_by_status.completed),
      trend: 'up' as const,
      tone: 'positive' as const,
      description: 'Goals that have achieved their targets.',
    },
  ];

  // Add draft card if there are draft goals waiting to be activated
  if (stats.goals_by_status.draft > 0) {
    items.push({
      id: 'metric-draft',
      label: 'Draft',
      value: String(stats.goals_by_status.draft),
      change: `${Math.round((stats.goals_by_status.draft / total) * 100)}%`,
      changeLabel: 'of total',
      trend: 'flat' as const,
      tone: 'neutral' as const,
      description: 'Goals in draft status waiting to be activated.',
    });
  }

  return { items };
};

/**
 * Resolve quick links for goals page
 */
const resolveGoalsQuickLinks: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'link-categories',
        title: 'Goal categories',
        description: 'Organize goals by ministry area or strategic theme',
        href: '/admin/community/planning/goals/categories',
        icon: 'FolderOpen',
      },
      {
        id: 'link-reports',
        title: 'Progress reports',
        description: 'View detailed reports on goal achievement',
        href: '/admin/community/planning/goals/reports',
        icon: 'BarChart3',
      },
      {
        id: 'link-calendar',
        title: 'Planning calendar',
        description: 'View goals alongside events and milestones',
        href: '/admin/community/planning/calendar',
        icon: 'Calendar',
      },
    ],
    actions: [
      {
        id: 'action-create',
        label: 'Create goal',
        href: '/admin/community/planning/goals/create',
        variant: 'primary',
      },
    ],
  };
};

/**
 * Map goal status to display variant
 */
function mapStatusVariant(status: GoalStatus): string {
  switch (status) {
    case 'completed':
      return 'success';
    case 'on_track':
      return 'info';
    case 'at_risk':
      return 'warning';
    case 'behind':
      return 'critical';
    case 'cancelled':
      return 'neutral';
    case 'draft':
    case 'active':
    default:
      return 'neutral';
  }
}

/**
 * Format status label for display
 */
function formatStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'on_track':
      return 'On Track';
    case 'at_risk':
      return 'At Risk';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Resolve goals table data
 */
const resolveGoalsTable: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);

  // Parse filters from request params
  const status = request.params?.status as string | undefined;
  const categoryId = request.params?.category_id as string | undefined;

  const { data: goals } = await goalsService.getGoals(
    {
      status: status as GoalStatus | undefined,
      category_id: categoryId,
    },
    {
      limit: 50,
      include_owner: true,
      include_counts: true,
    }
  );

  // Get categories for filter options
  const categories = await categoryService.getAll();

  // Transform goals to table rows
  const rows = goals.map((goal: Goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description || '',
    category: goal.category?.name || 'Uncategorized',
    categoryColor: goal.category?.color || '#6B7280',
    status: formatStatusLabel(goal.status),
    statusKey: goal.status,
    statusVariant: mapStatusVariant(goal.status),
    progress: goal.overall_progress || 0,
    owner: goal.owner_name || 'Unassigned',
    targetDate: goal.target_date
      ? formatDate(new Date(goal.target_date), timezone, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—',
    objectivesCount: goal.objectives_count || 0,
    keyResultsCount: goal.key_results_count || 0,
    // Link to goal detail page
    href: `/admin/community/planning/goals/${goal.id}`,
  }));

  return {
    rows,
    columns: [
      {
        field: 'title',
        headerName: 'Goal',
        type: 'link',
        hrefTemplate: '{{href}}',
        subtitleField: 'description',
        flex: 1,
      },
      {
        field: 'category',
        headerName: 'Category',
        type: 'badge',
        width: 140,
        badgeVariantField: 'categoryColor',
      },
      {
        field: 'status',
        headerName: 'Status',
        type: 'badge',
        width: 120,
        badgeVariantField: 'statusVariant',
      },
      {
        field: 'progress',
        headerName: 'Progress',
        width: 120,
      },
      {
        field: 'owner',
        headerName: 'Owner',
        width: 150,
      },
      {
        field: 'targetDate',
        headerName: 'Target Date',
        width: 130,
      },
    ],
    filters: [
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'All statuses', value: 'all' },
          { label: 'Draft', value: 'draft' },
          { label: 'Active', value: 'active' },
          { label: 'On Track', value: 'on_track' },
          { label: 'At Risk', value: 'at_risk' },
          { label: 'Behind', value: 'behind' },
          { label: 'Completed', value: 'completed' },
          { label: 'Cancelled', value: 'cancelled' },
        ],
      },
      {
        id: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { label: 'All categories', value: 'all' },
          ...categories.map((cat) => ({
            label: cat.name,
            value: cat.id,
          })),
        ],
      },
    ],
    actions: [
      {
        id: 'view',
        label: 'View',
        icon: 'Eye',
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: 'Pencil',
      },
    ],
    emptyState: {
      title: 'No goals yet',
      description: 'Create your first strategic goal to start tracking progress toward your church\'s vision.',
      actionLabel: 'Create goal',
      actionHref: '/admin/community/planning/goals/create',
    },
  };
};

/**
 * Resolve upcoming updates timeline
 */
const resolveUpcomingUpdates: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Get key results that need updates
  const keyResultsDue = await goalsService.getKeyResultsDueForUpdate(7); // Next 7 days

  const items = keyResultsDue.map((kr) => ({
    id: kr.id,
    title: kr.title,
    date: kr.next_update_due
      ? formatDate(new Date(kr.next_update_due), timezone, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : 'Due soon',
    timeAgo: kr.next_update_due
      ? `Due ${formatDate(new Date(kr.next_update_due), timezone)}`
      : 'Update needed',
    description: `Current: ${kr.current_value ?? 0} / Target: ${kr.target_value}`,
    category: kr.parent_title || 'Goal',
    stage: kr.current_value && kr.target_value && kr.current_value >= kr.target_value
      ? 'completed'
      : 'attention',
    icon: 'Target',
  }));

  return {
    items: items.length > 0
      ? items
      : [
          {
            id: 'no-updates',
            title: 'All caught up!',
            date: 'Now',
            timeAgo: '',
            description: 'No key results need progress updates this week.',
            category: 'Status',
            stage: 'completed',
            icon: 'CheckCircle',
          },
        ],
  };
};

// ==================== GOAL DETAIL PAGE HANDLERS ====================

/**
 * Resolve hero section for goal detail page
 */
const resolveGoalDetailHero: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const goal = await goalsService.getGoalById(goalId);

  if (!goal) {
    throw new Error('Goal not found');
  }

  // Calculate progress
  const progress = goal.overall_progress || 0;

  return {
    hero: {
      eyebrow: `${goal.category?.name || 'Goal'} · ${formatStatusLabel(goal.status)}`,
      headline: goal.title,
      description: goal.description || 'No description provided',
      metrics: [
        {
          label: 'Progress',
          value: `${Math.round(progress)}%`,
          caption: 'Overall completion',
        },
        {
          label: 'Objectives',
          value: String(goal.objectives_count || 0),
          caption: 'Linked objectives',
        },
        {
          label: 'Key Results',
          value: String(goal.key_results_count || 0),
          caption: 'Measurable outcomes',
        },
        {
          label: 'Target',
          value: goal.target_date
            ? new Date(goal.target_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—',
          caption: 'Goal deadline',
        },
      ],
    },
  };
};

/**
 * Resolve summary panels for goal detail page
 */
const resolveGoalDetailSummary: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const goal = await goalsService.getGoalById(goalId);

  if (!goal) {
    throw new Error('Goal not found');
  }

  return {
    summary: {
      panels: [
        {
          id: 'goal-info',
          title: 'Goal details',
          columns: 2,
          items: [
            {
              label: 'Category',
              value: goal.category?.name || 'Uncategorized',
              type: 'badge',
              badgeColor: goal.category?.color || '#6B7280',
            },
            {
              label: 'Status',
              value: formatStatusLabel(goal.status),
              type: 'badge',
              badgeVariant: mapStatusVariant(goal.status),
            },
            {
              label: 'Owner',
              value: goal.owner_name || 'Unassigned',
              type: 'text',
            },
            {
              label: 'Visibility',
              value: goal.visibility.charAt(0).toUpperCase() + goal.visibility.slice(1),
              type: 'text',
            },
            {
              label: 'Start Date',
              value: goal.start_date
                ? new Date(goal.start_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not set',
              type: 'date',
            },
            {
              label: 'Target Date',
              value: goal.target_date
                ? new Date(goal.target_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not set',
              type: 'date',
            },
          ],
        },
        {
          id: 'goal-description',
          title: 'Description',
          columns: 1,
          items: [
            {
              label: '',
              value: goal.description || 'No description provided.',
              type: 'multiline',
            },
          ],
        },
        ...(goal.tags && goal.tags.length > 0
          ? [
              {
                id: 'goal-tags',
                title: 'Tags',
                columns: 1,
                items: [
                  {
                    label: '',
                    value: goal.tags.join(', '),
                    type: 'text',
                  },
                ],
              },
            ]
          : []),
      ],
    },
  };
};

/**
 * Resolve objectives list for goal detail page
 */
const resolveGoalDetailObjectives: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const objectives = await goalsService.getObjectivesByGoalId(goalId);

  const rows = objectives.map((obj) => ({
    id: obj.id,
    title: obj.title,
    description: obj.description || '',
    status: obj.status.charAt(0).toUpperCase() + obj.status.slice(1),
    statusVariant: obj.status === 'completed' ? 'success' : obj.status === 'in_progress' ? 'info' : 'neutral',
    priority: obj.priority.charAt(0).toUpperCase() + obj.priority.slice(1),
    priorityVariant: obj.priority === 'high' ? 'critical' : obj.priority === 'urgent' ? 'warning' : 'neutral',
    responsible: obj.responsible_name || 'Unassigned',
    dueDate: obj.due_date
      ? new Date(obj.due_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—',
    keyResultsCount: obj.key_results_count || 0,
  }));

  return {
    objectives: {
      rows,
      columns: [
        { field: 'title', header: 'Objective', width: 'auto', sortable: true },
        { field: 'status', header: 'Status', width: '120px', badge: true, badgeVariantField: 'statusVariant' },
        { field: 'priority', header: 'Priority', width: '100px', badge: true, badgeVariantField: 'priorityVariant' },
        { field: 'responsible', header: 'Responsible', width: '150px' },
        { field: 'dueDate', header: 'Due Date', width: '120px' },
        { field: 'keyResultsCount', header: 'Key Results', width: '100px' },
      ],
      actions: [
        { id: 'view', label: 'View', icon: 'Eye' },
        { id: 'edit', label: 'Edit', icon: 'Pencil' },
      ],
      emptyState: {
        title: 'No objectives yet',
        description: 'Add ministry objectives to break down this goal into actionable items.',
        actionLabel: 'Add objective',
        actionHref: `/admin/community/planning/goals/${goalId}/objectives/create`,
      },
    },
  };
};

/**
 * Resolve key results list for goal detail page
 */
const resolveGoalDetailKeyResults: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const keyResults = await goalsService.getKeyResultsByGoalId(goalId);

  const rows = keyResults.map((kr) => ({
    id: kr.id,
    title: kr.title,
    description: kr.description || '',
    metricType: kr.metric_type.charAt(0).toUpperCase() + kr.metric_type.slice(1),
    currentValue: kr.current_value ?? 0,
    targetValue: kr.target_value,
    unitLabel: kr.unit_label || '',
    progress: kr.progress_percent ?? 0,
    status: kr.status.charAt(0).toUpperCase() + kr.status.slice(1),
    statusVariant: kr.status === 'completed' ? 'success' : kr.status === 'active' ? 'info' : 'neutral',
    lastUpdated: kr.updated_at
      ? new Date(kr.updated_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : '—',
  }));

  return {
    keyResults: {
      rows,
      columns: [
        { field: 'title', header: 'Key Result', width: 'auto', sortable: true },
        { field: 'progress', header: 'Progress', width: '120px', type: 'progress' },
        { field: 'currentValue', header: 'Current', width: '100px' },
        { field: 'targetValue', header: 'Target', width: '100px' },
        { field: 'status', header: 'Status', width: '100px', badge: true, badgeVariantField: 'statusVariant' },
        { field: 'lastUpdated', header: 'Updated', width: '100px' },
      ],
      actions: [
        { id: 'update', label: 'Update', icon: 'TrendingUp' },
        { id: 'edit', label: 'Edit', icon: 'Pencil' },
      ],
      emptyState: {
        title: 'No key results yet',
        description: 'Add measurable key results to track progress toward this goal.',
        actionLabel: 'Add key result',
        actionHref: `/admin/community/planning/goals/${goalId}/key-results/create`,
      },
    },
  };
};

/**
 * Resolve activity timeline for goal detail page
 */
const resolveGoalDetailActivity: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Get key results to find recent progress updates
  const keyResults = await goalsService.getKeyResultsByGoalId(goalId);

  // Collect recent progress updates from all key results
  const events: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    icon: string;
    category: string;
  }> = [];

  for (const kr of keyResults.slice(0, 5)) {
    try {
      const history = await goalsService.getProgressHistory(kr.id, { limit: 3 });
      for (const update of history) {
        events.push({
          id: update.id,
          title: `Progress update: ${kr.title}`,
          description: update.notes || `Updated to ${update.new_value}`,
          timestamp: update.recorded_at,
          icon: 'TrendingUp',
          category: 'Progress',
        });
      }
    } catch {
      // Skip if no history
    }
  }

  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    activity: {
      events: events.length > 0
        ? events.slice(0, 10).map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            date: new Date(e.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            timeAgo: formatTimeAgo(new Date(e.timestamp)),
            icon: e.icon,
            category: e.category,
          }))
        : [
            {
              id: 'no-activity',
              title: 'No recent activity',
              description: 'Progress updates and changes will appear here.',
              date: 'Now',
              timeAgo: '',
              icon: 'Clock',
              category: 'Status',
            },
          ],
    },
  };
};

/**
 * Delete goal handler
 */
const resolveGoalDelete: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  await goalsService.deleteGoal(goalId);

  return { success: true };
};

// ==================== GOAL MANAGE PAGE HANDLERS ====================

/**
 * Resolve hero section for goal manage page (create/edit)
 */
const resolveGoalManageHero: ServiceDataSourceHandler = async (request) => {
  const goalId = request.params?.goalId as string;
  const isEditMode = !!goalId;

  if (isEditMode) {
    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const goal = await goalsService.getGoalById(goalId);

    return {
      hero: {
        eyebrow: 'Goals & Objectives · Edit',
        headline: 'Update goal',
        description: `Editing: ${goal?.title || 'Goal'}`,
        metrics: [],
      },
    };
  }

  return {
    hero: {
      eyebrow: 'Goals & Objectives · Create',
      headline: 'Create a new goal',
      description: 'Set a strategic goal for your church or ministry with measurable key results.',
      metrics: [],
    },
  };
};

/**
 * Resolve form configuration for goal manage page
 */
const resolveGoalManageForm: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  const isEditMode = !!goalId;

  const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);
  const categories = await categoryService.getAll();

  // Fetch members for owner selection
  const membersDashboardService = container.get<MembersDashboardService>(TYPES.MembersDashboardService);
  const members = await membersDashboardService.getDirectory(undefined, 500) as Array<{
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string | null;
  }>;
  const memberOptions = members.map((member) => ({
    value: member.id || '',
    label: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Unknown',
  })).filter((opt) => opt.value !== '');

  // Get initial values for edit mode
  let initialValues: Record<string, unknown> = {
    title: '',
    description: '',
    category_id: '',
    status: 'draft',
    start_date: '',
    target_date: '',
    owner_id: '',
    visibility: 'staff',
    tags: '',
  };

  if (isEditMode) {
    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const goal = await goalsService.getGoalById(goalId);
    if (goal) {
      initialValues = {
        title: goal.title,
        description: goal.description || '',
        category_id: goal.category_id || '',
        status: goal.status || 'draft',
        start_date: goal.start_date ? goal.start_date.split('T')[0] : '',
        target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
        owner_id: goal.owner_id || '',
        visibility: goal.visibility,
        tags: goal.tags?.join(', ') || '',
      };
    }
  }

  return {
    form: {
      title: isEditMode ? 'Edit goal details' : 'Goal information',
      description: isEditMode
        ? 'Update the goal details below.'
        : 'Enter the details for your new strategic goal.',
      mode: isEditMode ? 'edit' : 'create',
      submitLabel: isEditMode ? 'Update goal' : 'Create goal',
      contextParams: isEditMode ? { goalId } : {},
      initialValues,
      fields: [
        {
          name: 'title',
          label: 'Goal title',
          type: 'text',
          colSpan: 'full',
          placeholder: 'Enter goal title',
          helperText: 'A clear, concise title for this strategic goal.',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe the goal and its purpose...',
          helperText: 'Provide details about what this goal aims to achieve.',
          required: false,
        },
        {
          name: 'category_id',
          label: 'Category',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select category',
          helperText: 'Organize goals by ministry area or theme.',
          required: false,
          options: [
            { value: '', label: 'No category' },
            ...categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
            })),
          ],
        },
        {
          name: 'owner_id',
          label: 'Goal owner',
          type: 'combobox',
          colSpan: 'half',
          placeholder: 'Select owner',
          searchPlaceholder: 'Search members...',
          emptyMessage: 'No members found.',
          helperText: 'Person responsible for this goal.',
          required: false,
          options: [
            { value: '', label: 'No owner assigned' },
            ...memberOptions,
          ],
        },
        {
          name: 'visibility',
          label: 'Visibility',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select visibility',
          helperText: 'Who can view this goal.',
          required: true,
          options: [
            { value: 'private', label: 'Private (Owner only)' },
            { value: 'leadership', label: 'Leadership' },
            { value: 'staff', label: 'Staff' },
            { value: 'public', label: 'Public (All members)' },
          ],
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select status',
          helperText: 'Current status of this goal.',
          required: true,
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'on_track', label: 'On Track' },
            { value: 'at_risk', label: 'At Risk' },
            { value: 'behind', label: 'Behind' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
        {
          name: 'start_date',
          label: 'Start date',
          type: 'date',
          colSpan: 'half',
          helperText: 'When to begin tracking this goal.',
          required: false,
        },
        {
          name: 'target_date',
          label: 'Target date',
          type: 'date',
          colSpan: 'half',
          helperText: 'When this goal should be achieved.',
          required: false,
        },
        {
          name: 'tags',
          label: 'Tags',
          type: 'text',
          colSpan: 'full',
          placeholder: 'growth, discipleship, outreach',
          helperText: 'Comma-separated tags for filtering and organization.',
          required: false,
        },
      ],
    },
  };
};

/**
 * Save goal handler (create or update)
 */
const resolveGoalManageSave: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const formData = (request.params?.formData as unknown) as Record<string, unknown> | undefined;
  const goalId = request.params?.goalId as string;
  const isEditMode = !!goalId;

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Parse tags
  const tagsString = (formData?.tags as string) || '';
  const tags = tagsString
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Parse and validate status
  const statusValue = (formData?.status as string) || 'draft';
  const validStatuses = ['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled'] as const;
  const status = validStatuses.includes(statusValue as typeof validStatuses[number])
    ? (statusValue as typeof validStatuses[number])
    : 'draft';

  const goalData = {
    title: formData?.title as string,
    description: (formData?.description as string) || undefined,
    category_id: (formData?.category_id as string) || undefined,
    status,
    start_date: (formData?.start_date as string) || undefined,
    target_date: (formData?.target_date as string) || undefined,
    owner_id: (formData?.owner_id as string) || undefined,
    visibility: ((formData?.visibility as string) || 'staff') as 'private' | 'leadership' | 'staff' | 'public',
    tags: tags.length > 0 ? tags : undefined,
  };

  let resultGoalId: string;

  if (isEditMode) {
    const updatedGoal = await goalsService.updateGoal(goalId, goalData);
    resultGoalId = updatedGoal.id;
  } else {
    const newGoal = await goalsService.createGoal(goalData);
    resultGoalId = newGoal.id;
  }

  return { goalId: resultGoalId };
};

/**
 * Format time ago helper
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ==================== CATEGORY MANAGEMENT HANDLERS ====================

/**
 * Available icon options for categories
 */
const CATEGORY_ICON_OPTIONS = [
  { value: 'heart', label: 'Heart' },
  { value: 'users', label: 'Users' },
  { value: 'dollar-sign', label: 'Dollar Sign' },
  { value: 'trending-up', label: 'Trending Up' },
  { value: 'building', label: 'Building' },
  { value: 'megaphone', label: 'Megaphone' },
  { value: 'target', label: 'Target' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'book-open', label: 'Book Open' },
  { value: 'star', label: 'Star' },
  { value: 'flag', label: 'Flag' },
  { value: 'check-circle', label: 'Check Circle' },
];

/**
 * Default color options for categories
 */
const CATEGORY_COLOR_OPTIONS = [
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#f97316', label: 'Orange' },
  { value: '#10b981', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#ef4444', label: 'Red' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#6366f1', label: 'Indigo' },
];

/**
 * Resolve categories list for management page
 */
const resolveCategoriesList: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);
  const categories = await categoryService.getAll();

  const rows = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    code: cat.code,
    description: cat.description || '',
    color: cat.color,
    icon: cat.icon,
    isSystem: cat.is_system,
    isActive: cat.is_active,
    sortOrder: cat.sort_order,
    goalsCount: 0, // TODO: Add count from goals table
    // Pre-computed badge values for Type column
    typeLabel: cat.is_system ? 'System' : 'Custom',
    typeVariant: cat.is_system ? 'neutral' : 'info',
  }));

  return {
    categories: {
      rows,
      columns: [
        {
          field: 'name',
          header: 'Name',
          width: 'auto',
          sortable: true,
          render: 'categoryName', // Custom render with color swatch
        },
        { field: 'code', header: 'Code', width: '150px' },
        { field: 'description', header: 'Description', width: '250px' },
        {
          field: 'typeLabel',
          header: 'Type',
          width: '100px',
          badge: true,
          badgeVariantField: 'typeVariant',
        },
        { field: 'sortOrder', header: 'Order', width: '80px' },
      ],
      actions: [
        { id: 'edit', label: 'Edit', icon: 'Pencil', href: '/admin/community/planning/goals/categories/create?categoryId={{id}}' },
        { id: 'delete', label: 'Delete', icon: 'Trash2', variant: 'destructive', disabled: '{{isSystem}}' },
      ],
      emptyState: {
        title: 'No categories yet',
        description: 'Create categories to organize your goals by ministry area or theme.',
        actionLabel: 'Add category',
        actionHref: '/admin/community/planning/goals/categories/create',
      },
    },
  };
};

/**
 * Resolve category form configuration (for inline dialog)
 */
const resolveCategoryForm: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const isEditMode = !!categoryId;

  let initialValues: Record<string, unknown> = {
    name: '',
    code: '',
    description: '',
    color: '#3b82f6',
    icon: 'target',
    sort_order: 0,
  };

  if (isEditMode) {
    const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);
    const category = await categoryService.getById(categoryId);
    if (category) {
      initialValues = {
        name: category.name,
        code: category.code,
        description: category.description || '',
        color: category.color,
        icon: category.icon,
        sort_order: category.sort_order,
      };
    }
  }

  return {
    form: {
      title: isEditMode ? 'Edit category' : 'Add category',
      description: isEditMode
        ? 'Update the category details.'
        : 'Create a new category to organize your goals.',
      submitLabel: isEditMode ? 'Update' : 'Create',
      contextParams: isEditMode ? { categoryId } : {},
      initialValues,
      dialogTrigger: false,
      fields: [
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          colSpan: 'full',
          placeholder: 'e.g., Spiritual Growth',
          helperText: 'A descriptive name for this category.',
          required: true,
        },
        {
          name: 'code',
          label: 'Code',
          type: 'text',
          colSpan: 'half',
          placeholder: 'e.g., spiritual-growth',
          helperText: 'Unique identifier. Auto-generated from name.',
          required: false,
          deriveSlugFrom: 'name',
          readOnly: true,
        },
        {
          name: 'sort_order',
          label: 'Sort Order',
          type: 'number',
          colSpan: 'half',
          placeholder: '0',
          helperText: 'Display order (lower numbers first).',
          required: false,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe what types of goals belong in this category...',
          helperText: 'Optional description for this category.',
          required: false,
        },
        {
          name: 'color',
          label: 'Color',
          type: 'select',
          colSpan: 'half',
          helperText: 'Display color for this category.',
          required: true,
          options: CATEGORY_COLOR_OPTIONS,
        },
        {
          name: 'icon',
          label: 'Icon',
          type: 'select',
          colSpan: 'half',
          helperText: 'Icon to display with this category.',
          required: true,
          options: CATEGORY_ICON_OPTIONS,
        },
      ],
    },
  };
};

/**
 * Resolve hero section for category manage page
 */
const resolveCategoryManageHero: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const isEditMode = !!categoryId;

  if (isEditMode) {
    const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);
    const category = await categoryService.getById(categoryId);

    return {
      hero: {
        eyebrow: 'Categories · Edit',
        headline: 'Update category',
        description: `Editing: ${category?.name || 'Category'}`,
      },
    };
  }

  return {
    hero: {
      eyebrow: 'Categories · Create',
      headline: 'Create a new category',
      description: 'Add a category to organize your goals by ministry area or theme.',
    },
  };
};

/**
 * Resolve form configuration for category manage page
 */
const resolveCategoryManageForm: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const categoryId = request.params?.categoryId as string;
  const isEditMode = !!categoryId;

  let initialValues: Record<string, unknown> = {
    name: '',
    code: '',
    description: '',
    color: '#3b82f6',
    icon: 'target',
    sort_order: 0,
  };

  let isSystemCategory = false;

  if (isEditMode) {
    const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);
    const category = await categoryService.getById(categoryId);
    if (category) {
      initialValues = {
        name: category.name,
        code: category.code,
        description: category.description || '',
        color: category.color,
        icon: category.icon,
        sort_order: category.sort_order,
      };
      isSystemCategory = category.is_system;
    }
  }

  return {
    form: {
      title: isEditMode ? 'Edit category details' : 'Category information',
      description: isEditMode
        ? isSystemCategory
          ? 'System categories have limited editing options.'
          : 'Update the category details below.'
        : 'Enter the details for your new category.',
      mode: isEditMode ? 'edit' : 'create',
      submitLabel: isEditMode ? 'Update category' : 'Create category',
      contextParams: isEditMode ? { categoryId } : {},
      initialValues,
      fields: [
        {
          name: 'name',
          label: 'Category name',
          type: 'text',
          colSpan: 'full',
          placeholder: 'e.g., Spiritual Growth',
          helperText: 'A descriptive name for this category.',
          required: true,
        },
        {
          name: 'code',
          label: 'Code',
          type: 'text',
          colSpan: 'half',
          placeholder: 'e.g., spiritual-growth',
          helperText: 'Unique identifier. Auto-generated from name.',
          required: false,
          disabled: isSystemCategory,
          deriveSlugFrom: 'name',
          readOnly: true,
        },
        {
          name: 'sort_order',
          label: 'Sort order',
          type: 'number',
          colSpan: 'half',
          placeholder: '0',
          helperText: 'Display order (lower numbers appear first).',
          required: false,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe what types of goals belong in this category...',
          helperText: 'Optional description to help users choose the right category.',
          required: false,
        },
        {
          name: 'color',
          label: 'Color',
          type: 'select',
          colSpan: 'half',
          helperText: 'Color used for badges and visual indicators.',
          required: true,
          options: CATEGORY_COLOR_OPTIONS,
        },
        {
          name: 'icon',
          label: 'Icon',
          type: 'select',
          colSpan: 'half',
          helperText: 'Icon displayed next to the category name.',
          required: true,
          options: CATEGORY_ICON_OPTIONS,
        },
      ],
    },
  };
};

/**
 * Save category handler (create or update)
 */
const resolveCategoryManageSave: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const formData = (request.params?.formData as unknown) as Record<string, unknown> | undefined;
  const categoryId = request.params?.categoryId as string;
  const isEditMode = !!categoryId;

  const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);

  const categoryData = {
    name: formData?.name as string,
    code: (formData?.code as string) || undefined,
    description: (formData?.description as string) || undefined,
    color: (formData?.color as string) || '#3b82f6',
    icon: (formData?.icon as string) || 'target',
    sort_order: Number(formData?.sort_order) || 0,
  };

  if (isEditMode) {
    await categoryService.update(categoryId, categoryData);
    return { success: true, categoryId };
  } else {
    const newCategory = await categoryService.create(categoryData);
    return { success: true, categoryId: newCategory.id };
  }
};

/**
 * Delete category handler
 */
const resolveCategoryDelete: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const categoryId = request.params?.categoryId as string;
  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);
  await categoryService.delete(categoryId);

  return { success: true };
};

// ==================== DYNAMIC COMPONENT HANDLERS ====================

/**
 * Resolve goals cards data for GoalCard component
 * Returns goal data in format expected by the GoalCard dynamic component
 */
const resolveGoalsCards: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const { data: goals } = await goalsService.getGoals(
    {},
    {
      limit: 12,
      include_owner: true,
      include_counts: true,
    }
  );

  // Transform to GoalCardData format
  const items = goals.map((goal: Goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description || null,
    category: goal.category
      ? {
          name: goal.category.name,
          color: goal.category.color || null,
          icon: goal.category.icon || null,
        }
      : null,
    status: goal.status,
    progress: goal.overall_progress || 0,
    targetDate: goal.target_date || null,
    ownerName: goal.owner_name || null,
    objectivesCount: goal.objectives_count || 0,
    keyResultsCount: goal.key_results_count || 0,
    tags: goal.tags || [],
  }));

  return { items };
};

/**
 * Resolve OKR tree data for OKRTreeView component
 * Returns full goal hierarchy with objectives and key results
 */
const resolveGoalOkrTree: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Get the goal with full details
  const goal = await goalsService.getGoalById(goalId);
  if (!goal) {
    throw new Error('Goal not found');
  }

  // Get objectives
  const objectives = await goalsService.getObjectivesByGoalId(goalId);

  // Get key results for each objective
  const objectivesWithKRs = await Promise.all(
    objectives.map(async (obj) => {
      const keyResults = await goalsService.getKeyResultsByObjectiveId(obj.id);
      return {
        id: obj.id,
        title: obj.title,
        description: obj.description || null,
        status: obj.status as "draft" | "active" | "on_track" | "at_risk" | "behind" | "completed" | "cancelled",
        priority: obj.priority as "low" | "normal" | "high" | "urgent",
        progress: obj.overall_progress || 0,
        responsibleName: obj.responsible_name || null,
        dueDate: obj.due_date || null,
        keyResults: keyResults.map((kr) => ({
          id: kr.id,
          title: kr.title,
          progress: kr.progress_percent || 0,
          currentValue: kr.current_value || 0,
          targetValue: kr.target_value,
          unitLabel: kr.unit_label || null,
          status: kr.status as "active" | "completed" | "cancelled",
        })),
      };
    })
  );

  // Get direct key results (not linked to objectives)
  const directKeyResults = await goalsService.getKeyResultsByGoalId(goalId);
  const directKRs = directKeyResults.map((kr) => ({
    id: kr.id,
    title: kr.title,
    progress: kr.progress_percent || 0,
    currentValue: kr.current_value || 0,
    targetValue: kr.target_value,
    unitLabel: kr.unit_label || null,
    status: kr.status as "active" | "completed" | "cancelled",
  }));

  return {
    okrTree: {
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description || null,
        category: goal.category
          ? {
              name: goal.category.name,
              color: goal.category.color || null,
              icon: goal.category.icon || null,
            }
          : null,
        status: goal.status as "draft" | "active" | "on_track" | "at_risk" | "behind" | "completed" | "cancelled",
        progress: goal.overall_progress || 0,
        targetDate: goal.target_date || null,
        ownerName: goal.owner_name || null,
        objectives: objectivesWithKRs,
        directKeyResults: directKRs,
      },
    },
  };
};

/**
 * Resolve key results cards data for KeyResultProgressCard component
 */
const resolveGoalKeyResultsCards: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const keyResults = await goalsService.getKeyResultsByGoalId(goalId);

  // Transform to KeyResultData format for KeyResultProgressCard
  const items = keyResults.map((kr) => ({
    id: kr.id,
    title: kr.title,
    description: kr.description || null,
    metricType: kr.metric_type as "number" | "percentage" | "currency" | "boolean",
    targetValue: kr.target_value,
    currentValue: kr.current_value || 0,
    startingValue: kr.starting_value ?? undefined,
    unitLabel: kr.unit_label || null,
    progress: kr.progress_percent || 0,
    status: kr.status as "active" | "completed" | "cancelled",
    updateFrequency: kr.update_frequency as "weekly" | "biweekly" | "monthly" | "quarterly" | null,
    nextUpdateDue: kr.next_update_due || null,
    lastUpdatedAt: kr.updated_at || null,
    isAutoLinked: kr.metric_link_type !== null && kr.metric_link_type !== 'none',
    metricLinkType: kr.metric_link_type || null,
    parentTitle: null, // Direct goal key results don't show parent
    parentType: 'goal' as const,
  }));

  return {
    keyResultsCards: { items },
  };
};

/**
 * Resolve timeline data for GoalStatusTimeline component
 */
const resolveGoalTimeline: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Get the goal for created_at info
  const goal = await goalsService.getGoalById(goalId);

  // Get key results to find recent progress updates
  const keyResults = await goalsService.getKeyResultsByGoalId(goalId);

  // Collect events from various sources
  const events: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    timestamp: string;
    user: { name: string; avatar: string | null } | null;
    metadata: {
      oldValue?: string | null;
      newValue?: string | null;
      progress?: number | null;
      targetName?: string | null;
    } | null;
  }> = [];

  // Add goal created event
  if (goal?.created_at) {
    events.push({
      id: `goal-created-${goal.id}`,
      type: 'goal_created',
      title: 'Goal created',
      description: `"${goal.title}" was created`,
      timestamp: goal.created_at,
      user: goal.owner_name ? { name: goal.owner_name, avatar: null } : null,
      metadata: null,
    });
  }

  // Collect progress updates from key results
  for (const kr of keyResults.slice(0, 10)) {
    try {
      const history = await goalsService.getProgressHistory(kr.id, { limit: 5 });
      for (const update of history) {
        const progressPercent = kr.target_value > 0
          ? Math.round((update.new_value / kr.target_value) * 100)
          : 0;

        events.push({
          id: update.id,
          type: 'progress_recorded',
          title: `Progress recorded`,
          description: update.notes || `${kr.title}: Updated to ${update.new_value}${kr.unit_label ? ` ${kr.unit_label}` : ''}`,
          timestamp: update.recorded_at,
          user: update.created_by_name ? { name: update.created_by_name, avatar: null } : null,
          metadata: {
            oldValue: update.previous_value !== null ? String(update.previous_value) : null,
            newValue: String(update.new_value),
            progress: progressPercent,
            targetName: kr.title,
          },
        });
      }
    } catch {
      // Skip if no history available
    }
  }

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // If no events, add placeholder
  if (events.length === 0) {
    events.push({
      id: 'no-activity',
      type: 'goal_created',
      title: 'No recent activity',
      description: 'Progress updates and changes will appear here as they happen.',
      timestamp: new Date().toISOString(),
      user: null,
      metadata: null,
    });
  }

  return {
    timeline: {
      events: events.slice(0, 20), // Limit to 20 events
    },
  };
};

// ==================== OBJECTIVE MANAGEMENT HANDLERS ====================

/**
 * Resolve hero section for objective manage page (create/edit)
 */
const resolveObjectiveManageHero: ServiceDataSourceHandler = async (request) => {
  const goalId = request.params?.goalId as string;
  const objectiveId = request.params?.objectiveId as string;
  const isEditMode = !!objectiveId;

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Get goal for context
  let goalTitle = 'Goal';
  if (goalId) {
    const goal = await goalsService.getGoalById(goalId);
    goalTitle = goal?.title || 'Goal';
  }

  if (isEditMode) {
    const objective = await goalsService.getObjectiveById(objectiveId);
    return {
      hero: {
        eyebrow: `${goalTitle} > Objectives > Edit`,
        headline: 'Update objective',
        description: `Editing: ${objective?.title || 'Objective'}`,
        metrics: [],
      },
    };
  }

  return {
    hero: {
      eyebrow: `${goalTitle} > Objectives > Create`,
      headline: 'Add a new objective',
      description: 'Create an objective to break down this goal into actionable items.',
      metrics: [],
    },
  };
};

/**
 * Priority options for objectives
 */
const OBJECTIVE_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/**
 * Resolve form configuration for objective manage page
 */
const resolveObjectiveManageForm: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  const objectiveId = request.params?.objectiveId as string;
  const isEditMode = !!objectiveId;

  // Get initial values for edit mode
  let initialValues: Record<string, unknown> = {
    title: '',
    description: '',
    responsible_id: '',
    status: 'pending',
    priority: 'normal',
    due_date: '',
  };

  if (isEditMode) {
    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const objective = await goalsService.getObjectiveById(objectiveId);
    if (objective) {
      initialValues = {
        title: objective.title,
        description: objective.description || '',
        responsible_id: objective.responsible_id || '',
        status: objective.status || 'pending',
        priority: objective.priority || 'normal',
        due_date: objective.due_date ? objective.due_date.split('T')[0] : '',
      };
    }
  }

  return {
    form: {
      title: isEditMode ? 'Edit objective details' : 'Objective information',
      description: isEditMode
        ? 'Update the objective details below.'
        : 'Enter the details for your new objective.',
      mode: isEditMode ? 'edit' : 'create',
      submitLabel: isEditMode ? 'Update objective' : 'Create objective',
      contextParams: { goalId, ...(isEditMode ? { objectiveId } : {}) },
      initialValues,
      fields: [
        {
          name: 'title',
          label: 'Objective title',
          type: 'text',
          colSpan: 'full',
          placeholder: 'Enter objective title',
          helperText: 'A clear, actionable title for this objective.',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe the objective and expected outcomes...',
          helperText: 'Provide details about what this objective aims to achieve.',
          required: false,
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select status',
          helperText: 'Current status of this objective.',
          required: true,
          options: OBJECTIVE_STATUS_OPTIONS,
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select priority',
          helperText: 'Priority level for this objective.',
          required: true,
          options: OBJECTIVE_PRIORITY_OPTIONS,
        },
        {
          name: 'due_date',
          label: 'Due date',
          type: 'date',
          colSpan: 'half',
          helperText: 'When this objective should be completed.',
          required: false,
        },
      ],
    },
  };
};

/**
 * Save objective handler (create or update)
 */
const resolveObjectiveManageSave: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const formData = (request.params?.formData as unknown) as Record<string, unknown> | undefined;
  const goalId = request.params?.goalId as string;
  const objectiveId = request.params?.objectiveId as string;
  const isEditMode = !!objectiveId;

  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  const objectiveData = {
    title: formData?.title as string,
    description: (formData?.description as string) || undefined,
    responsible_id: (formData?.responsible_id as string) || undefined,
    priority: ((formData?.priority as string) || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
    due_date: (formData?.due_date as string) || undefined,
  };

  if (isEditMode) {
    await goalsService.updateObjective(objectiveId, objectiveData);
    return { success: true, objectiveId, goalId };
  } else {
    const newObjective = await goalsService.createObjective({
      goal_id: goalId,
      ...objectiveData,
    });
    return { success: true, objectiveId: newObjective.id, goalId };
  }
};

// ==================== OBJECTIVE DETAIL HANDLERS ====================

/**
 * Status options for objectives
 */
const OBJECTIVE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'behind', label: 'Behind' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Resolve hero section for objective detail page
 */
const resolveObjectiveDetailHero: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  const objectiveId = request.params?.objectiveId as string;

  if (!objectiveId) {
    throw new Error('Objective ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const objective = await goalsService.getObjectiveById(objectiveId);

  if (!objective) {
    throw new Error('Objective not found');
  }

  // Get parent goal for context
  const goal = goalId ? await goalsService.getGoalById(goalId) : null;

  // Get key results count for this objective
  const keyResults = await goalsService.getKeyResultsByObjectiveId(objectiveId);

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    active: 'Active',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return {
    hero: {
      eyebrow: goal ? `Goal: ${goal.title}` : 'Objective Details',
      headline: objective.title,
      description: objective.description || `Status: ${statusLabels[objective.status] || objective.status} | ${keyResults.length} key results`,
      metrics: [
        {
          label: 'Progress',
          value: `${Math.round(objective.overall_progress || 0)}%`,
          caption: 'Objective completion',
        },
        {
          label: 'Key Results',
          value: String(keyResults.length),
          caption: 'Attached metrics',
        },
        {
          label: 'Priority',
          value: objective.priority?.charAt(0).toUpperCase() + (objective.priority?.slice(1) || ''),
          caption: 'Objective priority',
        },
      ],
    },
  };
};

/**
 * Resolve summary for objective detail page (read-only view)
 */
const resolveObjectiveDetailSummary: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const objectiveId = request.params?.objectiveId as string;

  if (!objectiveId) {
    throw new Error('Objective ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const objective = await goalsService.getObjectiveById(objectiveId);

  if (!objective) {
    throw new Error('Objective not found');
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  const priorityLabels: Record<string, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };

  // Build summary items for read-only display
  const items = [
    {
      label: 'Description',
      value: objective.description || 'No description provided',
      type: 'text',
    },
    {
      label: 'Status',
      value: statusLabels[objective.status] || objective.status,
      type: 'badge',
      badgeVariant: objective.status === 'completed' ? 'success' :
                    objective.status === 'at_risk' ? 'warning' :
                    objective.status === 'behind' ? 'destructive' : 'default',
    },
    {
      label: 'Priority',
      value: priorityLabels[objective.priority] || objective.priority,
      type: 'badge',
      badgeVariant: objective.priority === 'urgent' ? 'destructive' :
                    objective.priority === 'high' ? 'warning' : 'default',
    },
    {
      label: 'Due Date',
      value: objective.due_date
        ? new Date(objective.due_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : 'No due date set',
      type: 'text',
    },
    {
      label: 'Progress',
      value: `${Math.round(objective.overall_progress || 0)}%`,
      type: 'progress',
      progressValue: objective.overall_progress || 0,
    },
  ];

  // Add responsible person if set
  if (objective.responsible_name) {
    items.push({
      label: 'Responsible',
      value: objective.responsible_name,
      type: 'text',
    });
  }

  // Add ministry/department if set
  if (objective.ministry_department) {
    items.push({
      label: 'Ministry/Department',
      value: objective.ministry_department,
      type: 'text',
    });
  }

  return {
    summary: {
      items,
    },
  };
};

/**
 * Resolve key results list for objective detail page
 */
const resolveObjectiveDetailKeyResults: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const objectiveId = request.params?.objectiveId as string;

  if (!objectiveId) {
    throw new Error('Objective ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const keyResults = await goalsService.getKeyResultsByObjectiveId(objectiveId);

  return {
    keyResults: {
      items: keyResults.map((kr) => ({
        id: kr.id,
        title: kr.title,
        description: kr.description,
        metricType: kr.metric_type,
        targetValue: kr.target_value,
        currentValue: kr.current_value || 0,
        startingValue: kr.starting_value ?? 0,
        unitLabel: kr.unit_label || null,
        progress: kr.progress_percent || 0,
        status: kr.status,
        updateFrequency: kr.update_frequency,
        nextUpdateDue: kr.next_update_due || null,
        lastUpdatedAt: kr.updated_at || null,
      })),
    },
  };
};

/**
 * Resolve delete section for objective detail page
 */
const resolveObjectiveDetailDelete: ServiceDataSourceHandler = async (request) => {
  const objectiveId = request.params?.objectiveId as string;

  if (!objectiveId) {
    throw new Error('Objective ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const objective = await goalsService.getObjectiveById(objectiveId);

  return {
    delete: {
      confirmText: objective?.title || 'DELETE',
    },
  };
};

// ==================== KEY RESULT MANAGEMENT HANDLERS ====================

/**
 * Metric type options for key results
 */
const KEY_RESULT_METRIC_TYPE_OPTIONS = [
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'currency', label: 'Currency' },
  { value: 'boolean', label: 'Yes/No (Boolean)' },
];

/**
 * Update frequency options for key results
 */
const KEY_RESULT_UPDATE_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

/**
 * Resolve hero section for key result manage page (create/edit)
 */
const resolveKeyResultManageHero: ServiceDataSourceHandler = async (request) => {
  const goalId = request.params?.goalId as string;
  const keyResultId = request.params?.keyResultId as string;
  const isEditMode = !!keyResultId;

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Get goal for context
  let goalTitle = 'Goal';
  if (goalId) {
    const goal = await goalsService.getGoalById(goalId);
    goalTitle = goal?.title || 'Goal';
  }

  if (isEditMode) {
    const keyResult = await goalsService.getKeyResultById(keyResultId);
    return {
      hero: {
        eyebrow: `${goalTitle} > Key Results > Edit`,
        headline: 'Update key result',
        description: `Editing: ${keyResult?.title || 'Key Result'}`,
        metrics: [],
      },
    };
  }

  return {
    hero: {
      eyebrow: `${goalTitle} > Key Results > Create`,
      headline: 'Add a new key result',
      description: 'Create a measurable key result to track progress toward this goal.',
      metrics: [],
    },
  };
};

/**
 * Resolve form configuration for key result manage page
 */
const resolveKeyResultManageForm: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalId = request.params?.goalId as string;
  const keyResultId = request.params?.keyResultId as string;
  const isEditMode = !!keyResultId;

  // Get initial values for edit mode
  let initialValues: Record<string, unknown> = {
    title: '',
    description: '',
    metric_type: 'number',
    target_value: '',
    starting_value: '0',
    unit_label: '',
    update_frequency: 'weekly',
  };

  if (isEditMode) {
    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const keyResult = await goalsService.getKeyResultById(keyResultId);
    if (keyResult) {
      initialValues = {
        title: keyResult.title,
        description: keyResult.description || '',
        metric_type: keyResult.metric_type || 'number',
        target_value: String(keyResult.target_value || ''),
        starting_value: String(keyResult.starting_value ?? '0'),
        unit_label: keyResult.unit_label || '',
        update_frequency: keyResult.update_frequency || 'weekly',
      };
    }
  }

  return {
    form: {
      title: isEditMode ? 'Edit key result details' : 'Key result information',
      description: isEditMode
        ? 'Update the key result details below.'
        : 'Enter the details for your new measurable key result.',
      mode: isEditMode ? 'edit' : 'create',
      submitLabel: isEditMode ? 'Update key result' : 'Create key result',
      contextParams: { goalId, ...(isEditMode ? { keyResultId } : {}) },
      initialValues,
      fields: [
        {
          name: 'title',
          label: 'Key result title',
          type: 'text',
          colSpan: 'full',
          placeholder: 'e.g., Increase weekly attendance by 20%',
          helperText: 'A clear, measurable title for this key result.',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe how this key result will be measured...',
          helperText: 'Provide details about what this key result tracks.',
          required: false,
        },
        {
          name: 'metric_type',
          label: 'Metric type',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select metric type',
          helperText: 'The type of measurement for this key result.',
          required: true,
          options: KEY_RESULT_METRIC_TYPE_OPTIONS,
        },
        {
          name: 'update_frequency',
          label: 'Update frequency',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select frequency',
          helperText: 'How often progress should be recorded.',
          required: true,
          options: KEY_RESULT_UPDATE_FREQUENCY_OPTIONS,
        },
        {
          name: 'target_value',
          label: 'Target value',
          type: 'number',
          colSpan: 'third',
          placeholder: 'e.g., 100',
          helperText: 'The target value to achieve.',
          required: true,
        },
        {
          name: 'starting_value',
          label: 'Starting value',
          type: 'number',
          colSpan: 'third',
          placeholder: 'e.g., 0',
          helperText: 'The baseline/starting value.',
          required: false,
        },
        {
          name: 'unit_label',
          label: 'Unit label',
          type: 'text',
          colSpan: 'third',
          placeholder: 'e.g., members, $, %',
          helperText: 'Unit of measurement (optional).',
          required: false,
        },
      ],
    },
  };
};

/**
 * Save key result handler (create or update)
 */
const resolveKeyResultManageSave: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const formData = (request.params?.formData as unknown) as Record<string, unknown> | undefined;
  const goalId = request.params?.goalId as string;
  const keyResultId = request.params?.keyResultId as string;
  const isEditMode = !!keyResultId;

  if (!goalId) {
    throw new Error('Goal ID is required');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  const keyResultData = {
    title: formData?.title as string,
    description: (formData?.description as string) || undefined,
    metric_type: ((formData?.metric_type as string) || 'number') as 'number' | 'percentage' | 'currency' | 'boolean',
    target_value: Number(formData?.target_value) || 0,
    starting_value: Number(formData?.starting_value) ?? 0,
    unit_label: (formData?.unit_label as string) || undefined,
    update_frequency: ((formData?.update_frequency as string) || 'weekly') as 'weekly' | 'biweekly' | 'monthly' | 'quarterly',
  };

  if (isEditMode) {
    await goalsService.updateKeyResult(keyResultId, keyResultData);
    return { success: true, keyResultId, goalId };
  } else {
    const newKeyResult = await goalsService.createKeyResult({
      goal_id: goalId,
      ...keyResultData,
    });
    return { success: true, keyResultId: newKeyResult.id, goalId };
  }
};

/**
 * Objective-level key result manage hero handler
 */
const resolveObjectiveKeyResultManageHero: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const keyResultId = request.params?.keyResultId as string;
  const _objectiveId = request.params?.objectiveId as string;
  const isEditMode = !!keyResultId;

  let keyResult = null;
  if (isEditMode) {
    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    keyResult = await goalsService.getKeyResultById(keyResultId);
  }

  return {
    hero: {
      eyebrow: isEditMode ? 'Edit Key Result' : 'New Key Result',
      headline: isEditMode
        ? `Edit: ${keyResult?.title || 'Key Result'}`
        : 'Add a new key result',
      description: isEditMode
        ? 'Update the key result details below.'
        : 'Key results are measurable outcomes that define success for this objective.',
      metrics: [],
    },
  };
};

/**
 * Objective-level key result manage form handler
 */
const resolveObjectiveKeyResultManageForm: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const keyResultId = request.params?.keyResultId as string;
  const goalId = request.params?.goalId as string;
  const objectiveId = request.params?.objectiveId as string;
  const isEditMode = !!keyResultId;

  let initialValues: Record<string, unknown> = {};

  if (isEditMode) {
    const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
    const keyResult = await goalsService.getKeyResultById(keyResultId);
    if (keyResult) {
      initialValues = {
        title: keyResult.title,
        description: keyResult.description,
        metric_type: keyResult.metric_type,
        target_value: keyResult.target_value,
        starting_value: keyResult.starting_value,
        unit_label: keyResult.unit_label,
        update_frequency: keyResult.update_frequency,
      };
    }
  }

  return {
    form: {
      title: isEditMode ? 'Edit Key Result' : 'Key Result Details',
      description: 'Define the measurable outcome for this objective.',
      submitLabel: isEditMode ? 'Update Key Result' : 'Create Key Result',
      initialValues,
      contextParams: { goalId, objectiveId, keyResultId },
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          colSpan: 'full',
          placeholder: 'e.g., Increase member engagement by 20%',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe what this key result measures...',
          required: false,
        },
        {
          name: 'metric_type',
          label: 'Metric type',
          type: 'select',
          colSpan: 'half',
          required: true,
          options: [
            { value: 'number', label: 'Number' },
            { value: 'percentage', label: 'Percentage' },
            { value: 'currency', label: 'Currency' },
            { value: 'boolean', label: 'Yes/No' },
          ],
        },
        {
          name: 'update_frequency',
          label: 'Update frequency',
          type: 'select',
          colSpan: 'half',
          required: true,
          options: KEY_RESULT_UPDATE_FREQUENCY_OPTIONS,
        },
        {
          name: 'target_value',
          label: 'Target value',
          type: 'number',
          colSpan: 'third',
          placeholder: 'e.g., 100',
          helperText: 'The goal value to achieve.',
          required: true,
        },
        {
          name: 'starting_value',
          label: 'Starting value',
          type: 'number',
          colSpan: 'third',
          placeholder: 'e.g., 0',
          helperText: 'The baseline/starting value.',
          required: false,
        },
        {
          name: 'unit_label',
          label: 'Unit label',
          type: 'text',
          colSpan: 'third',
          placeholder: 'e.g., members, $, %',
          helperText: 'Unit of measurement (optional).',
          required: false,
        },
      ],
    },
  };
};

// ==================== REPORTS PAGE HANDLERS ====================

/**
 * Resolve hero section data for reports page
 */
const resolveReportsHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const stats = await goalsService.getDashboardStats();

  const completionRate = stats.total_goals > 0
    ? Math.round((stats.goals_by_status.completed / stats.total_goals) * 100)
    : 0;

  return {
    eyebrow: 'Goals & Objectives',
    headline: 'Progress Reports',
    description: 'View detailed reports on goal achievement, progress trends, and key result performance across all strategic goals.',
    metrics: [
      {
        label: 'Completion Rate',
        value: `${completionRate}%`,
        caption: `${stats.goals_by_status.completed} of ${stats.total_goals} goals`,
      },
      {
        label: 'Avg Progress',
        value: `${Math.round(stats.average_progress)}%`,
        caption: 'Across all active goals',
      },
      {
        label: 'Key Results',
        value: String(stats.total_key_results),
        caption: `${stats.key_results_completed} completed`,
      },
    ],
  };
};

/**
 * Resolve summary metrics for reports page
 */
const resolveReportsSummary: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const stats = await goalsService.getDashboardStats();

  const activeGoals = stats.goals_by_status.active + stats.goals_by_status.on_track +
    stats.goals_by_status.at_risk + stats.goals_by_status.behind;
  const healthyGoals = stats.goals_by_status.on_track + stats.goals_by_status.completed;
  const healthRate = stats.total_goals > 0 ? Math.round((healthyGoals / stats.total_goals) * 100) : 0;
  const krCompletionRate = stats.total_key_results > 0
    ? Math.round((stats.key_results_completed / stats.total_key_results) * 100)
    : 0;

  return {
    items: [
      {
        id: 'summary-total',
        label: 'Total Goals',
        value: String(stats.total_goals),
        change: `${activeGoals} active`,
        changeLabel: '',
        trend: 'flat' as const,
        tone: 'neutral' as const,
        description: 'All strategic goals in the system.',
      },
      {
        id: 'summary-health',
        label: 'Health Rate',
        value: `${healthRate}%`,
        change: `${healthyGoals} goals`,
        changeLabel: 'on track or completed',
        trend: healthRate >= 70 ? 'up' as const : 'down' as const,
        tone: healthRate >= 70 ? 'positive' as const : 'warning' as const,
        description: 'Percentage of goals that are healthy.',
      },
      {
        id: 'summary-kr-completion',
        label: 'Key Result Completion',
        value: `${krCompletionRate}%`,
        change: `${stats.key_results_completed}/${stats.total_key_results}`,
        changeLabel: 'completed',
        trend: krCompletionRate >= 50 ? 'up' as const : 'flat' as const,
        tone: krCompletionRate >= 50 ? 'positive' as const : 'neutral' as const,
        description: 'Key results that have reached their targets.',
      },
      {
        id: 'summary-updates',
        label: 'Updates Due',
        value: String(stats.updates_due_this_week),
        change: `${stats.overdue_updates} overdue`,
        changeLabel: '',
        trend: stats.overdue_updates > 0 ? 'down' as const : 'up' as const,
        tone: stats.overdue_updates > 0 ? 'warning' as const : 'positive' as const,
        description: 'Key results needing progress updates.',
      },
    ],
  };
};

/**
 * Resolve progress by category table for reports page
 */
const resolveReportsCategoryProgress: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const categoryService = container.get<GoalCategoryService>(TYPES.GoalCategoryService);

  const [{ data: goals }, categories] = await Promise.all([
    goalsService.getGoals({}, { include_category: true }),
    categoryService.getAll(),
  ]);

  // Group goals by category and calculate stats
  const categoryMap = new Map<string, { name: string; color: string; goals: Goal[] }>();

  // Initialize with categories
  for (const cat of categories) {
    categoryMap.set(cat.id, { name: cat.name, color: cat.color, goals: [] });
  }
  categoryMap.set('uncategorized', { name: 'Uncategorized', color: '#6b7280', goals: [] });

  // Group goals
  for (const goal of goals) {
    const key = goal.category_id || 'uncategorized';
    const group = categoryMap.get(key);
    if (group) {
      group.goals.push(goal);
    }
  }

  const rows = Array.from(categoryMap.entries())
    .filter(([, data]) => data.goals.length > 0)
    .map(([id, data]) => {
      const totalGoals = data.goals.length;
      const avgProgress = totalGoals > 0
        ? Math.round(data.goals.reduce((sum, g) => sum + (g.overall_progress || 0), 0) / totalGoals)
        : 0;
      const completed = data.goals.filter(g => g.status === 'completed').length;
      const onTrack = data.goals.filter(g => g.status === 'on_track').length;
      const atRisk = data.goals.filter(g => g.status === 'at_risk' || g.status === 'behind').length;

      return {
        id,
        category: data.name,
        categoryColor: data.color,
        totalGoals,
        avgProgress: `${avgProgress}%`,
        completed,
        onTrack,
        atRisk,
      };
    })
    .sort((a, b) => b.totalGoals - a.totalGoals);

  return {
    rows,
    columns: [
      { key: 'category', label: 'Category', width: '200px' },
      { key: 'totalGoals', label: 'Goals', width: '80px', align: 'center' as const },
      { key: 'avgProgress', label: 'Avg Progress', width: '100px', align: 'center' as const },
      { key: 'completed', label: 'Completed', width: '100px', align: 'center' as const },
      { key: 'onTrack', label: 'On Track', width: '100px', align: 'center' as const },
      { key: 'atRisk', label: 'At Risk', width: '100px', align: 'center' as const },
    ],
    emptyState: {
      title: 'No categories with goals',
      description: 'Create goals and assign them to categories to see progress breakdowns.',
      icon: 'FolderOpen',
    },
  };
};

/**
 * Resolve status distribution table for reports page
 */
const resolveReportsStatusDistribution: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const stats = await goalsService.getDashboardStats();
  const total = stats.total_goals || 1;

  const statusConfig: Record<GoalStatus, { label: string; color: string; description: string }> = {
    draft: { label: 'Draft', color: '#6b7280', description: 'Goals being prepared' },
    active: { label: 'Active', color: '#3b82f6', description: 'Goals in progress' },
    on_track: { label: 'On Track', color: '#22c55e', description: 'Progressing as planned' },
    at_risk: { label: 'At Risk', color: '#f59e0b', description: 'May not meet targets' },
    behind: { label: 'Behind', color: '#ef4444', description: 'Significantly delayed' },
    completed: { label: 'Completed', color: '#10b981', description: 'Successfully achieved' },
    cancelled: { label: 'Cancelled', color: '#9ca3af', description: 'No longer pursued' },
  };

  const rows = Object.entries(stats.goals_by_status)
    .map(([status, count]) => {
      const config = statusConfig[status as GoalStatus];
      return {
        id: status,
        status: config.label,
        statusColor: config.color,
        description: config.description,
        count,
        percentage: `${Math.round((count / total) * 100)}%`,
      };
    })
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    rows,
    columns: [
      { key: 'status', label: 'Status', width: '150px' },
      { key: 'description', label: 'Description', width: '250px' },
      { key: 'count', label: 'Count', width: '80px', align: 'center' as const },
      { key: 'percentage', label: '% of Total', width: '100px', align: 'center' as const },
    ],
    emptyState: {
      title: 'No goals yet',
      description: 'Create your first goal to see status distribution.',
      icon: 'Target',
    },
  };
};

/**
 * Resolve key results summary metrics for reports page
 */
const resolveReportsKeyResultsSummary: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);
  const stats = await goalsService.getDashboardStats();

  const activeKRs = stats.total_key_results - stats.key_results_completed;
  const completionRate = stats.total_key_results > 0
    ? Math.round((stats.key_results_completed / stats.total_key_results) * 100)
    : 0;

  return {
    items: [
      {
        id: 'kr-total',
        label: 'Total Key Results',
        value: String(stats.total_key_results),
        change: `${activeKRs} active`,
        changeLabel: '',
        trend: 'flat' as const,
        tone: 'neutral' as const,
        description: 'Measurable outcomes across all goals.',
      },
      {
        id: 'kr-completed',
        label: 'Completed',
        value: String(stats.key_results_completed),
        change: `${completionRate}%`,
        changeLabel: 'completion rate',
        trend: 'up' as const,
        tone: 'positive' as const,
        description: 'Key results that reached their targets.',
      },
      {
        id: 'kr-at-risk',
        label: 'At Risk',
        value: String(stats.key_results_at_risk),
        change: stats.key_results_at_risk > 0 ? 'Action needed' : 'All healthy',
        changeLabel: '',
        trend: stats.key_results_at_risk > 0 ? 'down' as const : 'up' as const,
        tone: stats.key_results_at_risk > 0 ? 'warning' as const : 'positive' as const,
        description: 'Key results that may not meet their targets.',
      },
      {
        id: 'kr-updates',
        label: 'Recent Updates',
        value: String(stats.recent_updates_count),
        change: 'This week',
        changeLabel: '',
        trend: stats.recent_updates_count > 0 ? 'up' as const : 'flat' as const,
        tone: 'neutral' as const,
        description: 'Progress updates recorded recently.',
      },
    ],
  };
};

/**
 * Resolve recent achievements timeline for reports page
 */
const resolveReportsRecentAchievements: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Get recently completed goals and objectives
  const [{ data: completedGoals }] = await Promise.all([
    goalsService.getGoals({ status: 'completed' }, { limit: 10, sort_by: 'updated_at', sort_order: 'desc' }),
  ]);

  // Get recent activity
  const recentActivity = await goalsService.getRecentActivity(15);

  // Filter to only achievements (completions, milestones)
  const achievements = recentActivity
    .filter(a => a.type === 'goal_status_changed' || a.type === 'objective_completed' || a.type === 'progress_recorded')
    .slice(0, 10);

  // Convert to timeline format
  const items = achievements.map(activity => ({
    id: activity.id,
    type: activity.type === 'goal_status_changed' ? 'milestone_reached' as const :
          activity.type === 'objective_completed' ? 'objective_added' as const :
          'progress_recorded' as const,
    title: activity.entity_title,
    description: activity.description,
    timestamp: activity.timestamp,
    user: activity.user_name ? { name: activity.user_name } : null,
    metadata: activity.metadata ? {
      progress: activity.metadata.progress as number | undefined,
      oldValue: activity.metadata.old_status as string | undefined,
      newValue: activity.metadata.new_status as string | undefined,
    } : null,
  }));

  // Add completed goals that might not be in activity
  const goalAchievements = completedGoals
    .filter(g => !achievements.some(a => a.entity_id === g.id))
    .slice(0, 5)
    .map(goal => ({
      id: `goal-${goal.id}`,
      type: 'milestone_reached' as const,
      title: goal.title,
      description: 'Goal completed',
      timestamp: goal.updated_at,
      user: goal.owner_name ? { name: goal.owner_name } : null,
      metadata: { progress: 100 },
    }));

  return {
    items: [...items, ...goalAchievements]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10),
  };
};

/**
 * Resolve overdue items table for reports page
 */
const resolveReportsOverdueItems: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const goalsService = container.get<IGoalsService>(TYPES.GoalsService);

  // Get goals that are at risk or behind
  const [{ data: atRiskGoals }, { data: behindGoals }] = await Promise.all([
    goalsService.getGoals({ status: 'at_risk' }, { limit: 20 }),
    goalsService.getGoals({ status: 'behind' }, { limit: 20 }),
  ]);

  const allOverdueGoals = [...atRiskGoals, ...behindGoals];

  const rows = allOverdueGoals.map(goal => ({
    id: goal.id,
    title: goal.title,
    type: 'Goal',
    status: goal.status === 'at_risk' ? 'At Risk' : 'Behind',
    statusColor: goal.status === 'at_risk' ? '#f59e0b' : '#ef4444',
    progress: `${Math.round(goal.overall_progress || 0)}%`,
    targetDate: goal.target_date ? new Date(goal.target_date).toLocaleDateString() : '—',
    owner: goal.owner_name || '—',
    href: `/admin/community/planning/goals/${goal.id}`,
  }));

  return {
    rows,
    columns: [
      { key: 'title', label: 'Title', width: '250px' },
      { key: 'type', label: 'Type', width: '80px' },
      { key: 'status', label: 'Status', width: '100px' },
      { key: 'progress', label: 'Progress', width: '100px', align: 'center' as const },
      { key: 'targetDate', label: 'Target Date', width: '120px' },
      { key: 'owner', label: 'Owner', width: '150px' },
    ],
    emptyState: {
      title: 'No items need attention',
      description: 'All goals and key results are progressing well.',
      icon: 'CheckCircle',
    },
  };
};

// Export all handlers
export const adminCommunityGoalsHandlers: Record<string, ServiceDataSourceHandler> = {
  // Goals list page handlers
  'admin-community.planning.goals.hero': resolveGoalsHero,
  'admin-community.planning.goals.metrics': resolveGoalsMetrics,
  'admin-community.planning.goals.quickLinks': resolveGoalsQuickLinks,
  'admin-community.planning.goals.table': resolveGoalsTable,
  'admin-community.planning.goals.upcomingUpdates': resolveUpcomingUpdates,
  // Dynamic component handlers (GoalCard, OKRTreeView, etc.)
  'admin-community.planning.goals.cards': resolveGoalsCards,
  // Goal detail page handlers
  'admin-community.planning.goals.detail.hero': resolveGoalDetailHero,
  'admin-community.planning.goals.detail.summary': resolveGoalDetailSummary,
  'admin-community.planning.goals.detail.objectives': resolveGoalDetailObjectives,
  'admin-community.planning.goals.detail.keyResults': resolveGoalDetailKeyResults,
  'admin-community.planning.goals.detail.activity': resolveGoalDetailActivity,
  'admin-community.planning.goals.detail.delete': resolveGoalDelete,
  // Dynamic component handlers for detail page
  'admin-community.planning.goals.detail.okrTree': resolveGoalOkrTree,
  'admin-community.planning.goals.detail.keyResultsCards': resolveGoalKeyResultsCards,
  'admin-community.planning.goals.detail.timeline': resolveGoalTimeline,
  // Goal manage page handlers
  'admin-community.planning.goals.manage.hero': resolveGoalManageHero,
  'admin-community.planning.goals.manage.form': resolveGoalManageForm,
  'admin-community.planning.goals.manage.save': resolveGoalManageSave,
  // Category management handlers
  'admin-community.planning.goals.categories.list': resolveCategoriesList,
  'admin-community.planning.goals.categories.form': resolveCategoryForm,
  'admin-community.planning.goals.categories.save': resolveCategoryManageSave,
  'admin-community.planning.goals.categories.delete': resolveCategoryDelete,
  'admin-community.planning.goals.categories.manage.hero': resolveCategoryManageHero,
  'admin-community.planning.goals.categories.manage.form': resolveCategoryManageForm,
  'admin-community.planning.goals.categories.manage.save': resolveCategoryManageSave,
  // Objective management handlers
  'admin-community.planning.goals.objectives.manage.hero': resolveObjectiveManageHero,
  'admin-community.planning.goals.objectives.manage.form': resolveObjectiveManageForm,
  'admin-community.planning.goals.objectives.manage.save': resolveObjectiveManageSave,
  // Objective detail handlers
  'admin-community.planning.goals.objectives.detail.hero': resolveObjectiveDetailHero,
  'admin-community.planning.goals.objectives.detail.summary': resolveObjectiveDetailSummary,
  'admin-community.planning.goals.objectives.detail.keyResults': resolveObjectiveDetailKeyResults,
  'admin-community.planning.goals.objectives.detail.delete': resolveObjectiveDetailDelete,
  // Key result management handlers (goal-level)
  'admin-community.planning.goals.keyResults.manage.hero': resolveKeyResultManageHero,
  'admin-community.planning.goals.keyResults.manage.form': resolveKeyResultManageForm,
  'admin-community.planning.goals.keyResults.manage.save': resolveKeyResultManageSave,
  // Key result management handlers (objective-level)
  'admin-community.planning.goals.objectives.keyResults.manage.hero': resolveObjectiveKeyResultManageHero,
  'admin-community.planning.goals.objectives.keyResults.manage.form': resolveObjectiveKeyResultManageForm,
  // Reports page handlers
  'admin-community.planning.goals.reports.hero': resolveReportsHero,
  'admin-community.planning.goals.reports.summary': resolveReportsSummary,
  'admin-community.planning.goals.reports.categoryProgress': resolveReportsCategoryProgress,
  'admin-community.planning.goals.reports.statusDistribution': resolveReportsStatusDistribution,
  'admin-community.planning.goals.reports.keyResultsSummary': resolveReportsKeyResultsSummary,
  'admin-community.planning.goals.reports.recentAchievements': resolveReportsRecentAchievements,
  'admin-community.planning.goals.reports.overdueItems': resolveReportsOverdueItems,
};
