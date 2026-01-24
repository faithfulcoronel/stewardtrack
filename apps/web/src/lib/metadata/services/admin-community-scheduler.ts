import { format } from 'date-fns';

import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { MinistryService } from '@/services/MinistryService';
import type { SchedulerService } from '@/services/SchedulerService';
import type { ScheduleOccurrenceService } from '@/services/ScheduleOccurrenceService';
import type { MemberProfileService } from '@/services/MemberProfileService';
import type { IScheduleRegistrationService } from '@/services/ScheduleRegistrationService';
import { getTenantTimezone, formatDate, formatTime } from './datetime-utils';

// ==================== SCHEDULER DASHBOARD HANDLERS ====================

/**
 * Resolves the hero section for the scheduler dashboard.
 * Returns eyebrow, headline, description, and key metrics.
 */
const resolveSchedulerDashboardHero: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const ministryService = container.get<MinistryService>(TYPES.MinistryService);
  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const occurrenceService = container.get<ScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);

  // Get counts for metrics
  const [ministries, schedules, upcomingOccurrences] = await Promise.all([
    ministryService.getAll(tenant.id),
    schedulerService.getAll(tenant.id),
    occurrenceService.getUpcoming(7, tenant.id), // Next 7 days
  ]);

  return {
    eyebrow: 'Scheduler · Community planning',
    headline: 'Ministry scheduler',
    description: 'Manage ministry schedules, worship services, events with registrations and QR attendance.',
    metrics: [
      { label: 'Ministries', value: String(ministries.length), caption: 'Active ministries' },
      { label: 'Schedules', value: String(schedules.length), caption: 'Recurring schedules' },
      { label: 'Upcoming', value: String(upcomingOccurrences.length), caption: 'Next 7 days' },
    ],
  };
};

/**
 * Resolves the quick links for the scheduler dashboard.
 */
const resolveSchedulerDashboardQuickLinks: ServiceDataSourceHandler = async () => {
  return {
    items: [
      {
        id: 'ministries',
        title: 'Ministries',
        description: 'Manage ministry groups and team assignments.',
        href: '/admin/community/planning/scheduler/ministries',
        icon: 'church',
      },
      {
        id: 'schedules',
        title: 'Schedules',
        description: 'Create and manage recurring ministry schedules.',
        href: '/admin/community/planning/scheduler/schedules',
        icon: 'calendar',
      },
      {
        id: 'occurrences',
        title: 'Occurrences',
        description: 'View and manage scheduled event occurrences.',
        href: '/admin/community/planning/scheduler/occurrences',
        icon: 'list',
      },
    ],
    actions: [],
  };
};

/**
 * Resolves upcoming occurrences for the scheduler dashboard timeline.
 */
const resolveSchedulerDashboardUpcoming: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const occurrenceService = container.get<ScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);
  const occurrences = await occurrenceService.getUpcoming(7, tenant.id);

  const items = occurrences.slice(0, 10).map((occurrence) => {
    const eventDate = new Date(occurrence.start_at);
    const now = new Date();
    const isToday = eventDate.toDateString() === now.toDateString();
    const isTomorrow = eventDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    let dateLabel = format(eventDate, 'EEE, MMM d');
    if (isToday) dateLabel = 'Today';
    if (isTomorrow) dateLabel = 'Tomorrow';

    const timeLabel = format(eventDate, 'h:mm a');

    let status: 'scheduled' | 'attention' | 'completed' | 'new' = 'scheduled';
    if (occurrence.status === 'completed') status = 'completed';
    else if (occurrence.status === 'cancelled') status = 'attention';
    else if (occurrence.status === 'in_progress') status = 'new';

    return {
      id: occurrence.id,
      title: occurrence.override_name || occurrence.schedule?.name || 'Event',
      description: occurrence.schedule?.ministry?.name || undefined,
      date: dateLabel,
      timeAgo: timeLabel,
      category: occurrence.schedule?.ministry?.name || 'Ministry',
      status,
      icon: 'calendar',
    };
  });

  return { items };
};

// ==================== MINISTRIES LIST HANDLERS ====================

/**
 * Resolves the hero section for the ministries list page.
 */
const resolveMinistriesListHero: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const ministryService = container.get<MinistryService>(TYPES.MinistryService);
  const ministries = await ministryService.getAll(tenant.id);

  const activeCount = ministries.filter(m => m.is_active !== false).length;

  return {
    eyebrow: 'Ministries · Scheduler module',
    headline: 'Ministry groups',
    description: 'View and manage ministry groups, teams, and schedules.',
    metrics: [
      { label: 'Total Ministries', value: String(ministries.length), caption: 'Ministry groups' },
      { label: 'Active', value: String(activeCount), caption: 'Currently active' },
    ],
  };
};

/**
 * Resolves the ministries table data.
 */
const resolveMinistriesTable: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const ministryService = container.get<MinistryService>(TYPES.MinistryService);
  const ministries = await ministryService.getWithTeamCounts(tenant.id);

  const rows = ministries.map((ministry) => ({
    id: ministry.id,
    name: ministry.name,
    description: ministry.description || '—',
    color: ministry.color || '#6366f1',
    teamCount: ministry.team_count ?? 0,
    scheduleCount: ministry.schedule_count ?? 0,
    isActive: ministry.is_active !== false,
    createdAt: ministry.created_at ? formatDate(new Date(ministry.created_at), timezone, { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
  }));

  return {
    rows,
    columns: [
      {
        field: 'name',
        headerName: 'Ministry',
        width: 200,
        type: 'link',
        hrefTemplate: '/admin/community/planning/scheduler/ministries/{{id}}',
        subtitleField: 'description',
      },
      { field: 'teamCount', headerName: 'Team Members', width: 120, align: 'center' },
      { field: 'scheduleCount', headerName: 'Schedules', width: 100, align: 'center' },
      { field: 'createdAt', headerName: 'Created', width: 120 },
      {
        field: 'actions',
        headerName: 'Actions',
        type: 'actions',
        width: 200,
        align: 'right',
        actions: [
          {
            id: 'view',
            label: 'View',
            urlTemplate: '/admin/community/planning/scheduler/ministries/{{id}}',
            intent: 'view',
          },
          {
            id: 'edit',
            label: 'Edit',
            urlTemplate: '/admin/community/planning/scheduler/ministries/manage?ministryId={{id}}',
            intent: 'edit',
          },
          {
            id: 'delete',
            label: 'Delete',
            intent: 'delete',
            handler: 'admin-community.scheduler.ministries.delete',
            confirm: 'Are you sure you want to delete "{{name}}"?',
            successMessage: 'Ministry "{{name}}" deleted successfully',
          },
        ],
      },
    ],
    filters: [
      {
        id: 'search',
        label: 'Search',
        type: 'search',
        placeholder: 'Search ministries...',
        fields: ['name', 'description'],
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        field: 'isActive',
        options: [
          { label: 'All', value: 'all' },
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' },
        ],
      },
    ],
    emptyState: {
      title: 'No ministries found',
      description: 'Create a ministry to start organizing teams and schedules.',
    },
  };
};

// ==================== SCHEDULES LIST HANDLERS ====================

/**
 * Resolves the hero section for the schedules list page.
 */
const resolveSchedulesListHero: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const schedules = await schedulerService.getAll(tenant.id);

  const activeCount = schedules.filter(s => s.is_active !== false).length;

  return {
    eyebrow: 'Schedules · Scheduler module',
    headline: 'Ministry schedules',
    description: 'Create and manage recurring ministry schedules and event patterns.',
    metrics: [
      { label: 'Total Schedules', value: String(schedules.length), caption: 'Defined schedules' },
      { label: 'Active', value: String(activeCount), caption: 'Currently active' },
    ],
  };
};

/**
 * Resolves the schedules table data.
 */
const resolveSchedulesTable: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const schedules = await schedulerService.getAll(tenant.id);

  const rows = schedules.map((schedule) => ({
    id: schedule.id,
    name: schedule.name,
    description: schedule.description || '—',
    ministryName: schedule.ministry?.name || '—',
    ministryColor: schedule.ministry?.color || '#6366f1',
    recurrencePattern: schedulerService.parseRecurrenceDescription(schedule.recurrence_rule ?? null) || '—',
    startTime: schedule.start_time ? formatTime(new Date(`2000-01-01T${schedule.start_time}`), timezone, { hour: 'numeric', minute: '2-digit', hour12: true }) : '—',
    duration: schedule.duration_minutes ? `${schedule.duration_minutes} min` : '—',
    isActive: schedule.is_active !== false,
  }));

  return {
    rows,
    columns: [
      {
        field: 'name',
        headerName: 'Schedule',
        width: 200,
        type: 'link',
        hrefTemplate: '/admin/community/planning/scheduler/schedules/{{id}}',
        subtitleField: 'description',
      },
      { field: 'ministryName', headerName: 'Ministry', width: 150 },
      { field: 'recurrencePattern', headerName: 'Recurrence', width: 150 },
      { field: 'startTime', headerName: 'Time', width: 100 },
      { field: 'duration', headerName: 'Duration', width: 100 },
      {
        field: 'actions',
        headerName: 'Actions',
        type: 'actions',
        width: 200,
        align: 'right',
        actions: [
          {
            id: 'view',
            label: 'View',
            urlTemplate: '/admin/community/planning/scheduler/schedules/{{id}}',
            intent: 'view',
          },
          {
            id: 'edit',
            label: 'Edit',
            urlTemplate: '/admin/community/planning/scheduler/schedules/manage?scheduleId={{id}}',
            intent: 'edit',
          },
          {
            id: 'delete',
            label: 'Delete',
            intent: 'delete',
            handler: 'admin-community.scheduler.schedules.delete',
            confirm: 'Are you sure you want to delete "{{name}}"?',
            successMessage: 'Schedule "{{name}}" deleted successfully',
          },
        ],
      },
    ],
    filters: [
      {
        id: 'search',
        label: 'Search',
        type: 'search',
        placeholder: 'Search schedules...',
        fields: ['name', 'description', 'ministryName'],
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        field: 'isActive',
        options: [
          { label: 'All', value: 'all' },
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' },
        ],
      },
    ],
    emptyState: {
      title: 'No schedules found',
      description: 'Create a schedule to define recurring ministry events.',
    },
  };
};

// ==================== OCCURRENCES LIST HANDLERS ====================

/**
 * Resolves the hero section for the occurrences list page.
 */
const resolveOccurrencesListHero: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const occurrenceService = container.get<ScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);

  // Get upcoming occurrences (next 30 days)
  const upcoming = await occurrenceService.getUpcoming(30, tenant.id);

  // Get past occurrences using date range
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const completed = await occurrenceService.getByFilters(
    { statuses: ['completed'] },
    tenant.id
  );

  return {
    eyebrow: 'Occurrences · Scheduler module',
    headline: 'Schedule occurrences',
    description: 'View and manage individual event occurrences, track attendance and registrations.',
    metrics: [
      { label: 'Upcoming', value: String(upcoming.length), caption: 'Next 30 days' },
      { label: 'Completed', value: String(completed.length), caption: 'Total completed' },
    ],
  };
};

/**
 * Resolves the occurrences table data.
 */
const resolveOccurrencesTable: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const occurrenceService = container.get<ScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);

  // Get all occurrences - using upcoming + past date range
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysFromNow = new Date(today);
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  const occurrences = await occurrenceService.getByDateRange(
    thirtyDaysAgo.toISOString().split('T')[0],
    sixtyDaysFromNow.toISOString().split('T')[0],
    tenant.id
  );

  const rows = occurrences.map((occurrence) => {
    const startDate = new Date(occurrence.start_at);
    return {
      id: occurrence.id,
      title: occurrence.override_name || occurrence.schedule?.name || 'Event',
      ministryName: occurrence.schedule?.ministry?.name || '—',
      ministryColor: occurrence.schedule?.ministry?.color || '#6366f1',
      date: format(startDate, 'EEE, MMM d, yyyy'),
      time: format(startDate, 'h:mm a'),
      status: occurrence.status,
      statusLabel: formatOccurrenceStatus(occurrence.status),
      registrationCount: occurrence.registered_count || 0,
      attendanceCount: occurrence.checked_in_count || 0,
    };
  });

  return {
    rows,
    columns: [
      { field: 'title', headerName: 'Event', width: 200 },
      { field: 'ministryName', headerName: 'Ministry', width: 150 },
      { field: 'date', headerName: 'Date', width: 150 },
      { field: 'time', headerName: 'Time', width: 100 },
      { field: 'statusLabel', headerName: 'Status', width: 120 },
      { field: 'registrationCount', headerName: 'Registered', width: 100, align: 'center' },
      { field: 'attendanceCount', headerName: 'Attended', width: 100, align: 'center' },
    ],
    filters: [
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'All', value: 'all' },
          { label: 'Scheduled', value: 'scheduled' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Completed', value: 'completed' },
          { label: 'Cancelled', value: 'cancelled' },
        ],
      },
      {
        id: 'dateRange',
        label: 'Date Range',
        type: 'select',
        options: [
          { label: 'All Time', value: 'all' },
          { label: 'Today', value: 'today' },
          { label: 'This Week', value: 'week' },
          { label: 'This Month', value: 'month' },
          { label: 'Past Events', value: 'past' },
        ],
      },
    ],
    actions: [
      { id: 'view', label: 'View Details', icon: 'eye' },
      { id: 'checkin', label: 'Check-in', icon: 'qr-code' },
      { id: 'start', label: 'Start Event', icon: 'play' },
      { id: 'complete', label: 'Complete', icon: 'check' },
      { id: 'cancel', label: 'Cancel', icon: 'x', variant: 'destructive' },
    ],
    emptyState: {
      title: 'No occurrences found',
      description: 'Generate occurrences from your schedules to see events here.',
    },
  };
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Extracts the first value from a param that may be string or string[].
 */
function firstParam(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : null;
  }
  return null;
}

function formatOccurrenceStatus(status: string | null | undefined): string {
  if (!status) return 'Scheduled';

  const statuses: Record<string, string> = {
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };

  return statuses[status] || status;
}

// ==================== MINISTRY DETAIL HANDLERS ====================

/**
 * Resolves the hero section for the ministry detail page.
 */
const resolveMinistryDetailHero: ServiceDataSourceHandler = async (request) => {
  const ministryId = firstParam(request.params?.ministryId);

  // If no ministry ID, return default for new ministry
  if (!ministryId || ministryId === 'new') {
    return {
      eyebrow: 'Create Ministry · Scheduler',
      headline: 'New ministry',
      description: 'Create a new ministry group for your organization.',
      metrics: [],
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const ministryService = container.get<MinistryService>(TYPES.MinistryService);
  const ministries = await ministryService.getWithTeamCounts(tenant.id);
  const ministry = ministries.find(m => m.id === ministryId);

  if (!ministry) {
    return {
      eyebrow: 'Ministry · Not Found',
      headline: 'Ministry not found',
      description: 'The requested ministry could not be found.',
      metrics: [],
    };
  }

  return {
    eyebrow: `Ministry · ${ministry.name}`,
    headline: ministry.name,
    description: ministry.description || 'Manage ministry details, team members, and schedules.',
    metrics: [
      { label: 'Team Members', value: String(ministry.team_count ?? 0), caption: 'Active members' },
      { label: 'Schedules', value: String(ministry.schedule_count ?? 0), caption: 'Recurring events' },
    ],
  };
};

/**
 * Resolves the ministry context for the detail page.
 */
const resolveMinistryDetailContext: ServiceDataSourceHandler = async (request) => {
  const ministryId = firstParam(request.params?.ministryId);

  if (!ministryId || ministryId === 'new') {
    return { ministry: null, isNew: true };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const ministryService = container.get<MinistryService>(TYPES.MinistryService);
  const ministry = await ministryService.getById(ministryId, tenant.id);

  return {
    ministry,
    isNew: false,
  };
};

/**
 * Resolves the ministry summary data.
 */
const resolveMinistryDetailSummary: ServiceDataSourceHandler = async (request) => {
  const ministryId = firstParam(request.params?.ministryId);

  if (!ministryId || ministryId === 'new') {
    return { summary: null };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const ministryService = container.get<MinistryService>(TYPES.MinistryService);
  const ministries = await ministryService.getWithTeamCounts(tenant.id);
  const ministry = ministries.find(m => m.id === ministryId);

  if (!ministry) {
    return { summary: null };
  }

  return {
    summary: {
      id: ministry.id,
      name: ministry.name,
      description: ministry.description,
      color: ministry.color || '#6366f1',
      icon: ministry.icon || 'church',
      isActive: ministry.is_active !== false,
      teamCount: ministry.team_count ?? 0,
      scheduleCount: ministry.schedule_count ?? 0,
      createdAt: ministry.created_at ? formatDate(new Date(ministry.created_at), timezone, { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    },
  };
};

/**
 * Resolves the schedules table for a specific ministry.
 */
const resolveMinistryDetailSchedules: ServiceDataSourceHandler = async (request) => {
  const ministryId = firstParam(request.params?.ministryId);

  if (!ministryId || ministryId === 'new') {
    return {
      rows: [],
      columns: [],
      emptyState: {
        title: 'No schedules',
        description: 'Create a ministry first, then add schedules.',
      },
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const schedules = await schedulerService.getByMinistry(ministryId, tenant.id);

  const rows = schedules.map((schedule) => ({
    id: schedule.id,
    name: schedule.name,
    recurrencePattern: schedulerService.parseRecurrenceDescription(schedule.recurrence_rule ?? null) || '—',
    startTime: schedule.start_time ? formatTime(new Date(`2000-01-01T${schedule.start_time}`), timezone, { hour: 'numeric', minute: '2-digit', hour12: true }) : '—',
    isActive: schedule.is_active !== false,
  }));

  return {
    rows,
    columns: [
      { field: 'name', headerName: 'Schedule', width: 200 },
      { field: 'recurrencePattern', headerName: 'Recurrence', width: 150 },
      { field: 'startTime', headerName: 'Time', width: 100 },
    ],
    actions: [
      { id: 'view', label: 'View', icon: 'eye' },
      { id: 'edit', label: 'Edit', icon: 'edit' },
    ],
    emptyState: {
      title: 'No schedules yet',
      description: 'Create a schedule to define recurring events for this ministry.',
    },
  };
};

/**
 * Resolves available members for team assignment.
 * Fetches from members table directly.
 */
const resolveAvailableMembers: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const memberProfileService = container.get<MemberProfileService>(TYPES.MemberProfileService);
  const members = await memberProfileService.getMembers({ limit: 500 });

  // Transform to the format expected by MinistryTeamManager
  const availableMembers = members.map((m) => ({
    id: m.id,
    name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown',
    email: m.email || null,
    phone: m.contact_number || null,
    avatarUrl: m.profile_picture_url || null,
  }));

  return { members: availableMembers };
};

// ==================== MINISTRY MANAGE HANDLERS ====================

/**
 * Resolves the hero section for the ministry manage page.
 * Context-aware: shows different content for create vs edit mode.
 */
const resolveMinistryManageHero: ServiceDataSourceHandler = async (request) => {
  const ministryId = firstParam(request.params?.ministryId);
  const isEditMode = ministryId && ministryId !== 'new';

  if (!isEditMode) {
    return {
      eyebrow: 'Add ministry · Scheduler',
      headline: 'Create a new ministry',
      description: 'Set up a new ministry group with team assignments and schedule configuration.',
      metrics: [
        { label: 'Mode', value: 'Create new', caption: 'Ministry ID assigned after save' },
        { label: 'Status', value: 'Draft', caption: 'Ready to configure' },
      ],
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const ministryService = container.get<MinistryService>(TYPES.MinistryService);
  const ministries = await ministryService.getWithTeamCounts(tenant.id);
  const ministry = ministries.find(m => m.id === ministryId);

  if (!ministry) {
    return {
      eyebrow: 'Edit ministry · Scheduler',
      headline: 'Ministry not found',
      description: 'The requested ministry could not be found.',
      metrics: [],
    };
  }

  return {
    eyebrow: `Edit ministry · ${ministry.category || 'Ministry'}`,
    headline: `Update ${ministry.name}`,
    description: ministry.description || 'Edit ministry details and configuration.',
    metrics: [
      { label: 'Mode', value: 'Edit existing', caption: `ID: ${ministry.id.slice(0, 8)}...` },
      { label: 'Status', value: ministry.is_active ? 'Active' : 'Inactive', caption: ministry.is_active ? 'Currently active' : 'Currently inactive' },
      { label: 'Team', value: String(ministry.team_count ?? 0), caption: 'Team members' },
    ],
  };
};

/**
 * Resolves the form configuration for the ministry manage page.
 * Provides form fields, initial values, and submission configuration.
 */
const resolveMinistryManageForm: ServiceDataSourceHandler = async (request) => {
  const ministryId = firstParam(request.params?.ministryId);
  const isEditMode = ministryId && ministryId !== 'new';

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let initialValues = {
    name: '',
    code: '',
    description: '',
    category: 'general',
    color: '#6366f1',
    icon: 'church',
    isActive: true,
  };

  if (isEditMode) {
    const ministryService = container.get<MinistryService>(TYPES.MinistryService);
    const ministry = await ministryService.getById(ministryId, tenant.id);

    if (ministry) {
      initialValues = {
        name: ministry.name || '',
        code: ministry.code || '',
        description: ministry.description || '',
        category: ministry.category || 'general',
        color: ministry.color || '#6366f1',
        icon: ministry.icon || 'church',
        isActive: ministry.is_active ?? true,
      };
    }
  }

  const categoryOptions = [
    { value: 'worship', label: 'Worship' },
    { value: 'education', label: 'Education' },
    { value: 'outreach', label: 'Outreach' },
    { value: 'fellowship', label: 'Fellowship' },
    { value: 'support', label: 'Support Services' },
    { value: 'general', label: 'General' },
  ];

  // AdminFormSection expects flat fields array with initialValues
  return {
    mode: isEditMode ? 'edit' : 'create',
    form: {
      fields: [
        {
          name: 'name',
          label: 'Ministry name',
          type: 'text',
          placeholder: 'Enter ministry name',
          required: true,
          colSpan: 'full',
        },
        {
          name: 'code',
          label: 'Code',
          type: 'text',
          placeholder: 'Auto-generated from name if empty',
          helperText: 'Unique identifier for this ministry (e.g., worship-team)',
          deriveSlugFrom: 'name',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Describe the ministry purpose and activities',
          colSpan: 'full',
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          options: categoryOptions,
        },
        {
          name: 'color',
          label: 'Color',
          type: 'color',
          placeholder: '#6366f1',
          helperText: 'Color for calendar display',
        },
        {
          name: 'icon',
          label: 'Icon',
          type: 'icon',
          placeholder: 'Select an icon',
          helperText: 'Icon for ministry display',
        },
        {
          name: 'isActive',
          label: 'Active ministry',
          type: 'toggle',
          helperText: 'Whether this ministry is currently active',
        },
      ],
      initialValues,
    },
    submitLabel: isEditMode ? 'Save changes' : 'Create ministry',
    submitAction: {
      id: 'submit-ministry',
      kind: 'metadata.service',
      config: {
        handler: 'admin-community.scheduler.ministries.manage.save',
        successMessage: isEditMode ? 'Ministry updated successfully' : 'Ministry created successfully',
      },
    },
  };
};

// ==================== SCHEDULE PROFILE HANDLERS ====================

/**
 * Resolves the hero section for the schedule profile page.
 */
const resolveScheduleProfileHero: ServiceDataSourceHandler = async (request) => {
  const scheduleId = firstParam(request.params?.scheduleId);

  if (!scheduleId || scheduleId === 'new') {
    return {
      eyebrow: 'Create Schedule · Scheduler',
      headline: 'New schedule',
      description: 'Create a new recurring schedule for your ministry.',
      metrics: [],
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const schedule = await schedulerService.getById(scheduleId, tenant.id);

  if (!schedule) {
    return {
      eyebrow: 'Schedule · Not Found',
      headline: 'Schedule not found',
      description: 'The requested schedule could not be found.',
      metrics: [],
    };
  }

  const occurrenceService = container.get<ScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);
  const upcomingOccurrences = await occurrenceService.getByFilters(
    { scheduleId: schedule.id, statuses: ['scheduled'] },
    tenant.id
  );

  return {
    eyebrow: `Schedule · ${schedule.ministry?.name || 'Ministry'}`,
    headline: schedule.name,
    description: schedule.description || 'Manage schedule details and view upcoming occurrences.',
    metrics: [
      {
        label: 'Recurrence',
        value: schedulerService.parseRecurrenceDescription(schedule.recurrence_rule ?? null) || 'Not set',
        caption: 'Pattern',
      },
      { label: 'Upcoming', value: String(upcomingOccurrences.length), caption: 'Occurrences' },
    ],
  };
};

/**
 * Resolves the schedule context for the profile page.
 * Returns flat fields for direct binding in XML components.
 */
const resolveScheduleProfileContext: ServiceDataSourceHandler = async (request) => {
  const scheduleId = firstParam(request.params?.scheduleId);

  if (!scheduleId || scheduleId === 'new') {
    return { schedule: null, scheduleId: null, scheduleName: null, isNew: true, registrationRequired: false };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const schedule = await schedulerService.getById(scheduleId, tenant.id);

  return {
    schedule,
    scheduleId: schedule?.id ?? null,
    scheduleName: schedule?.name ?? null,
    isNew: false,
    registrationRequired: schedule?.registration_required ?? false,
  };
};

/**
 * Resolves the schedule summary data.
 */
const resolveScheduleProfileSummary: ServiceDataSourceHandler = async (request) => {
  const scheduleId = firstParam(request.params?.scheduleId);

  if (!scheduleId || scheduleId === 'new') {
    return { summary: null };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const schedule = await schedulerService.getById(scheduleId, tenant.id);

  if (!schedule) {
    return { summary: null };
  }

  return {
    summary: {
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      ministryId: schedule.ministry_id,
      ministryName: schedule.ministry?.name || 'Unknown Ministry',
      ministryColor: schedule.ministry?.color || '#6366f1',
      scheduleType: schedule.schedule_type,
      startTime: schedule.start_time ? formatTime(new Date(`2000-01-01T${schedule.start_time}`), timezone, { hour: 'numeric', minute: '2-digit', hour12: true }) : null,
      endTime: schedule.end_time ? formatTime(new Date(`2000-01-01T${schedule.end_time}`), timezone, { hour: 'numeric', minute: '2-digit', hour12: true }) : null,
      durationMinutes: schedule.duration_minutes,
      recurrenceRule: schedule.recurrence_rule,
      recurrenceDescription: schedulerService.parseRecurrenceDescription(schedule.recurrence_rule ?? null),
      location: schedule.location,
      locationType: schedule.location_type,
      virtualMeetingUrl: schedule.virtual_meeting_url,
      capacity: schedule.capacity,
      registrationRequired: schedule.registration_required,
      isActive: schedule.is_active !== false,
      createdAt: schedule.created_at ? formatDate(new Date(schedule.created_at), timezone, { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    },
  };
};

/**
 * Resolves the upcoming occurrences for a schedule.
 */
const resolveScheduleProfileOccurrences: ServiceDataSourceHandler = async (request) => {
  const scheduleId = firstParam(request.params?.scheduleId);

  if (!scheduleId || scheduleId === 'new') {
    return {
      rows: [],
      columns: [],
      emptyState: {
        title: 'No occurrences',
        description: 'Create a schedule first, then generate occurrences.',
      },
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const occurrenceService = container.get<ScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);
  const occurrences = await occurrenceService.getByFilters(
    { scheduleId },
    tenant.id
  );

  const rows = occurrences.map((occurrence) => {
    const startDate = new Date(occurrence.start_at);
    return {
      id: occurrence.id,
      title: occurrence.override_name || occurrence.schedule?.name || 'Event',
      date: format(startDate, 'EEE, MMM d, yyyy'),
      time: format(startDate, 'h:mm a'),
      status: occurrence.status,
      statusLabel: formatOccurrenceStatus(occurrence.status),
      registrationCount: occurrence.registered_count || 0,
      attendanceCount: occurrence.checked_in_count || 0,
    };
  });

  return {
    rows,
    columns: [
      { field: 'title', headerName: 'Event', width: 200 },
      { field: 'date', headerName: 'Date', width: 150 },
      { field: 'time', headerName: 'Time', width: 100 },
      { field: 'statusLabel', headerName: 'Status', width: 120 },
      { field: 'registrationCount', headerName: 'Registered', width: 100, align: 'center' },
      { field: 'attendanceCount', headerName: 'Attended', width: 100, align: 'center' },
    ],
    actions: [
      { id: 'view', label: 'View Details', icon: 'eye' },
      { id: 'checkin', label: 'Check-in', icon: 'qr-code' },
    ],
    emptyState: {
      title: 'No occurrences yet',
      description: 'Generate occurrences from this schedule to see events here.',
    },
  };
};

// ==================== SCHEDULE MANAGE HANDLERS ====================

/**
 * Resolves the hero section for the schedule manage page.
 */
const resolveScheduleManageHero: ServiceDataSourceHandler = async (request) => {
  const scheduleId = firstParam(request.params?.scheduleId);
  const isEditMode = scheduleId && scheduleId !== 'new';

  if (!isEditMode) {
    return {
      eyebrow: 'Add schedule · Scheduler',
      headline: 'Create a new schedule',
      description: 'Set up a recurring schedule for your ministry.',
      metrics: [
        { label: 'Mode', value: 'Create new', caption: 'Schedule ID assigned after save' },
        { label: 'Status', value: 'Draft', caption: 'Ready to configure' },
      ],
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const schedule = await schedulerService.getById(scheduleId, tenant.id);

  if (!schedule) {
    return {
      eyebrow: 'Edit schedule · Scheduler',
      headline: 'Schedule not found',
      description: 'The requested schedule could not be found.',
      metrics: [],
    };
  }

  return {
    eyebrow: `Edit schedule · ${schedule.ministry?.name || 'Ministry'}`,
    headline: `Update ${schedule.name}`,
    description: schedule.description || 'Edit schedule details and configuration.',
    metrics: [
      { label: 'Mode', value: 'Edit existing', caption: `ID: ${schedule.id.slice(0, 8)}...` },
      { label: 'Status', value: schedule.is_active ? 'Active' : 'Inactive', caption: schedule.is_active ? 'Currently active' : 'Currently inactive' },
    ],
  };
};

/**
 * Resolves the form configuration for the schedule manage page.
 */
const resolveScheduleManageForm: ServiceDataSourceHandler = async (request) => {
  const scheduleId = firstParam(request.params?.scheduleId);
  const isEditMode = scheduleId && scheduleId !== 'new';

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get ministries for dropdown
  const ministryService = container.get<MinistryService>(TYPES.MinistryService);
  const ministries = await ministryService.getAll(tenant.id);
  const ministryOptions = ministries.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  let initialValues: {
    scheduleId: string | null;
    ministryId: string;
    name: string;
    description: string;
    scheduleType: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    recurrenceRule: string;
    recurrenceStartDate: string;
    location: string;
    locationType: string;
    virtualMeetingUrl: string;
    capacity: number | null;
    registrationRequired: boolean;
    registrationFormSchema: unknown[];
    coverPhotoUrl: string | null;
    isActive: boolean;
  } = {
    scheduleId: null,
    ministryId: '',
    name: '',
    description: '',
    scheduleType: 'service',
    startTime: '09:00',
    endTime: '',
    durationMinutes: 60,
    recurrenceRule: '',
    recurrenceStartDate: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    locationType: 'physical',
    virtualMeetingUrl: '',
    capacity: null,
    registrationRequired: false,
    registrationFormSchema: [],
    coverPhotoUrl: null,
    isActive: true,
  };

  if (isEditMode) {
    const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
    const schedule = await schedulerService.getById(scheduleId, tenant.id);

    if (schedule) {
      initialValues = {
        scheduleId: schedule.id,
        ministryId: schedule.ministry_id || '',
        name: schedule.name || '',
        description: schedule.description || '',
        scheduleType: schedule.schedule_type || 'service',
        startTime: schedule.start_time || '09:00',
        endTime: schedule.end_time || '',
        durationMinutes: schedule.duration_minutes || 60,
        recurrenceRule: schedule.recurrence_rule || '',
        recurrenceStartDate: schedule.recurrence_start_date || format(new Date(), 'yyyy-MM-dd'),
        location: schedule.location || '',
        locationType: schedule.location_type || 'physical',
        virtualMeetingUrl: schedule.virtual_meeting_url || '',
        capacity: schedule.capacity || null,
        registrationRequired: schedule.registration_required ?? false,
        registrationFormSchema: schedule.registration_form_schema || [],
        coverPhotoUrl: schedule.cover_photo_url || null,
        isActive: schedule.is_active ?? true,
      };
    }
  }

  const scheduleTypeOptions = [
    { value: 'service', label: 'Worship Service' },
    { value: 'bible_study', label: 'Bible Study' },
    { value: 'rehearsal', label: 'Rehearsal' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'conference', label: 'Conference' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'other', label: 'Other' },
  ];

  const locationTypeOptions = [
    { value: 'physical', label: 'Physical Location' },
    { value: 'virtual', label: 'Virtual (Online)' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  return {
    mode: isEditMode ? 'edit' : 'create',
    scheduleId: isEditMode ? scheduleId : null,
    form: {
      fields: [
        // Basic Information
        {
          name: 'ministryId',
          label: 'Ministry',
          type: 'select',
          options: ministryOptions,
          required: true,
          placeholder: 'Select a ministry',
        },
        {
          name: 'name',
          label: 'Schedule name',
          type: 'text',
          placeholder: 'Enter schedule name',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Describe this schedule',
          colSpan: 'full',
        },
        {
          name: 'scheduleType',
          label: 'Schedule type',
          type: 'select',
          options: scheduleTypeOptions,
        },
        // Date & Time Settings
        {
          name: 'recurrenceStartDate',
          label: 'Start date',
          type: 'date',
          required: true,
          helperText: 'When this schedule begins',
        },
        {
          name: 'startTime',
          label: 'Start time',
          type: 'time',
          required: true,
          placeholder: 'Select start time',
        },
        {
          name: 'endTime',
          label: 'End time',
          type: 'time',
          placeholder: 'Select end time',
        },
        {
          name: 'durationMinutes',
          label: 'Duration (minutes)',
          type: 'number',
          placeholder: '60',
          helperText: 'Auto-calculated from start/end if both provided',
        },
        {
          name: 'recurrenceRule',
          label: 'Repeats',
          type: 'recurrence',
          colSpan: 'full',
        },
        // Location Settings
        {
          name: 'locationType',
          label: 'Location type',
          type: 'select',
          options: locationTypeOptions,
        },
        {
          name: 'location',
          label: 'Location',
          type: 'text',
          placeholder: 'Enter location address or name',
        },
        {
          name: 'virtualMeetingUrl',
          label: 'Virtual meeting URL',
          type: 'text',
          placeholder: 'https://zoom.us/...',
          helperText: 'For virtual or hybrid events',
        },
        // Registration Settings
        {
          name: 'registrationRequired',
          label: 'Registration required',
          type: 'toggle',
          helperText: 'Require attendees to register beforehand',
        },
        // Capacity - only shown when registration is required
        {
          name: 'capacity',
          label: 'Capacity',
          type: 'number',
          placeholder: 'Leave empty for unlimited',
          helperText: 'Maximum number of registrations allowed',
          visibleWhen: {
            field: 'registrationRequired',
            isTruthy: true,
          },
        },
        {
          name: 'isActive',
          label: 'Active schedule',
          type: 'toggle',
          helperText: 'Whether this schedule is currently active',
        },
      ],
      initialValues,
    },
    submitLabel: isEditMode ? 'Save changes' : 'Create schedule',
    submitAction: {
      id: 'submit-schedule',
      kind: 'metadata.service',
      config: {
        handler: 'admin-community.scheduler.schedules.manage.save',
        successMessage: isEditMode ? 'Schedule updated successfully' : 'Schedule created successfully',
      },
    },
  };
};

// ==================== SCHEDULE REGISTRANTS HANDLER ====================

/**
 * Helper to format form response value for display
 */
function formatFormResponseValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Resolves the registrants table for a schedule profile page.
 * Shows all registrations across all occurrences for this schedule.
 * Dynamically includes form response fields as columns.
 */
const resolveScheduleProfileRegistrants: ServiceDataSourceHandler = async (request) => {
  const scheduleId = firstParam(request.params?.scheduleId);

  if (!scheduleId || scheduleId === 'new') {
    return {
      rows: [],
      columns: [],
      emptyState: {
        title: 'No registrations',
        description: 'Create a schedule first to see registrations.',
      },
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
  const occurrenceService = container.get<ScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService);
  const registrationService = container.get<IScheduleRegistrationService>(TYPES.ScheduleRegistrationService);

  // Get schedule to access form schema
  const schedule = await schedulerService.getById(scheduleId, tenant.id);
  const formSchema = schedule?.registration_form_schema || [];

  // Get all occurrences for this schedule
  const occurrences = await occurrenceService.getByFilters(
    { scheduleId },
    tenant.id
  );

  if (occurrences.length === 0) {
    return {
      rows: [],
      columns: [],
      emptyState: {
        title: 'No registrations yet',
        description: 'Generate occurrences and enable registration to see registrations here.',
      },
    };
  }

  // Collect all unique form field IDs from registrations (in case schema changed over time)
  // NOTE: Form responses use field.id as the key, not field.name
  const formFieldsMap = new Map<string, { id: string; label: string }>();

  // Add fields from schema first (preserves intended order)
  for (const field of formSchema) {
    formFieldsMap.set(field.id, { id: field.id, label: field.label });
  }

  // Fetch registrations for all occurrences
  const allRegistrations: Array<Record<string, unknown>> = [];

  for (const occurrence of occurrences) {
    const registrations = await registrationService.getByOccurrence(occurrence.id, tenant.id);
    const views = registrationService.toRegistrationViewList(registrations);

    for (const reg of views) {
      // Build base row data
      const row: Record<string, unknown> = {
        id: reg.id,
        displayName: reg.displayName,
        displayEmail: reg.displayEmail ?? '',
        displayPhone: reg.displayPhone ?? '',
        partySize: reg.partySize,
        confirmationCode: reg.confirmationCode ?? '',
        status: reg.status,
        statusLabel: reg.statusLabel,
        registrationDate: formatDate(reg.registrationDate, timezone, { month: 'short', day: 'numeric', year: 'numeric' }),
        occurrenceDate: formatDate(new Date(occurrence.start_at), timezone, { month: 'short', day: 'numeric', year: 'numeric' }),
        specialRequests: reg.specialRequests ?? '',
      };

      // Flatten form responses into the row
      const formResponses = reg.formResponses || {};
      for (const [key, value] of Object.entries(formResponses)) {
        // Add any fields not in schema (for backwards compatibility)
        if (!formFieldsMap.has(key)) {
          // Field not in current schema - use a generic label
          // (This can happen if schema was modified after registrations were created)
          formFieldsMap.set(key, { id: key, label: `Field ${formFieldsMap.size + 1}` });
        }
        // Store formatted value with a prefix to distinguish from base fields
        row[`form_${key}`] = formatFormResponseValue(value);
      }

      allRegistrations.push(row);
    }
  }

  // Sort by registration date (newest first)
  allRegistrations.sort((a, b) => {
    const dateA = new Date(a.registrationDate as string).getTime();
    const dateB = new Date(b.registrationDate as string).getTime();
    return dateB - dateA;
  });

  // Build base columns
  const baseColumns = [
    { field: 'displayName', headerName: 'Name', width: 180 },
    { field: 'displayEmail', headerName: 'Email', width: 200 },
    { field: 'displayPhone', headerName: 'Phone', width: 140 },
    { field: 'confirmationCode', headerName: 'Confirmation', width: 120 },
    { field: 'partySize', headerName: 'Party Size', width: 100, align: 'center' },
    { field: 'statusLabel', headerName: 'Status', width: 100 },
    { field: 'occurrenceDate', headerName: 'Event Date', width: 120 },
    { field: 'registrationDate', headerName: 'Registered', width: 120 },
  ];

  // Add dynamic form field columns
  const formFieldColumns: Array<{ field: string; headerName: string; width: number }> = [];
  for (const [fieldName, fieldInfo] of formFieldsMap) {
    formFieldColumns.push({
      field: `form_${fieldName}`,
      headerName: fieldInfo.label,
      width: 150,
    });
  }

  // Add special requests column at the end
  const allColumns = [
    ...baseColumns,
    ...formFieldColumns,
    { field: 'specialRequests', headerName: 'Special Requests', width: 200 },
  ];

  // Build search fields including form fields
  const searchFields = ['displayName', 'displayEmail', 'confirmationCode', 'specialRequests'];
  for (const [fieldName] of formFieldsMap) {
    searchFields.push(`form_${fieldName}`);
  }

  return {
    rows: allRegistrations,
    columns: allColumns,
    filters: [
      {
        id: 'search',
        label: 'Search',
        type: 'search',
        placeholder: 'Search registrants...',
        fields: searchFields,
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        field: 'status',
        options: [
          { label: 'All', value: 'all' },
          { label: 'Registered', value: 'registered' },
          { label: 'Waitlisted', value: 'waitlisted' },
          { label: 'Checked In', value: 'checked_in' },
          { label: 'No Show', value: 'no_show' },
          { label: 'Cancelled', value: 'cancelled' },
        ],
      },
    ],
    exportable: true,
    exportFilename: 'schedule-registrations',
    emptyState: {
      title: 'No registrations yet',
      description: 'No one has registered for this schedule yet.',
    },
  };
};

// ==================== EXPORT HANDLERS ====================

export const adminCommunitySchedulerHandlers: Record<string, ServiceDataSourceHandler> = {
  // Dashboard handlers
  'admin-community.scheduler.dashboard.hero': resolveSchedulerDashboardHero,
  'admin-community.scheduler.dashboard.quickLinks': resolveSchedulerDashboardQuickLinks,
  'admin-community.scheduler.dashboard.upcoming': resolveSchedulerDashboardUpcoming,

  // Ministries list handlers
  'admin-community.scheduler.ministries.list.hero': resolveMinistriesListHero,
  'admin-community.scheduler.ministries.list.table': resolveMinistriesTable,

  // Ministry profile handlers (primary - uses same handlers as detail for backward compatibility)
  'admin-community.scheduler.ministries.profile.hero': resolveMinistryDetailHero,
  'admin-community.scheduler.ministries.profile.context': resolveMinistryDetailContext,
  'admin-community.scheduler.ministries.profile.summary': resolveMinistryDetailSummary,
  'admin-community.scheduler.ministries.profile.schedules': resolveMinistryDetailSchedules,
  'admin-community.scheduler.ministries.profile.availableMembers': resolveAvailableMembers,

  // Ministry detail handlers (legacy - kept for backward compatibility)
  'admin-community.scheduler.ministries.detail.hero': resolveMinistryDetailHero,
  'admin-community.scheduler.ministries.detail.context': resolveMinistryDetailContext,
  'admin-community.scheduler.ministries.detail.summary': resolveMinistryDetailSummary,
  'admin-community.scheduler.ministries.detail.schedules': resolveMinistryDetailSchedules,
  'admin-community.scheduler.ministries.detail.availableMembers': resolveAvailableMembers,

  // Ministry manage handlers
  'admin-community.scheduler.ministries.manage.hero': resolveMinistryManageHero,
  'admin-community.scheduler.ministries.manage.form': resolveMinistryManageForm,

  // Schedules list handlers
  'admin-community.scheduler.schedules.list.hero': resolveSchedulesListHero,
  'admin-community.scheduler.schedules.list.table': resolveSchedulesTable,

  // Schedule profile handlers
  'admin-community.scheduler.schedules.profile.hero': resolveScheduleProfileHero,
  'admin-community.scheduler.schedules.profile.context': resolveScheduleProfileContext,
  'admin-community.scheduler.schedules.profile.summary': resolveScheduleProfileSummary,
  'admin-community.scheduler.schedules.profile.occurrences': resolveScheduleProfileOccurrences,
  'admin-community.scheduler.schedules.profile.registrants': resolveScheduleProfileRegistrants,

  // Schedule manage handlers
  'admin-community.scheduler.schedules.manage.hero': resolveScheduleManageHero,
  'admin-community.scheduler.schedules.manage.form': resolveScheduleManageForm,

  // Occurrences list handlers
  'admin-community.scheduler.occurrences.list.hero': resolveOccurrencesListHero,
  'admin-community.scheduler.occurrences.list.table': resolveOccurrencesTable,
};
