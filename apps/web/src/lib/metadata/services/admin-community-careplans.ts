import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MemberCarePlan } from '@/models/memberCarePlan.model';
import type { MemberCarePlanService } from '@/services/MemberCarePlanService';
import type { MembersDashboardService } from '@/services/MembersDashboardService';
import type { TenantService } from '@/services/TenantService';

// Helper type for member data from dashboard service
type MemberRecord = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
};

// Helper function to build member name lookup map
async function buildMemberNameMap(memberIds: string[]): Promise<Map<string, string>> {
  if (memberIds.length === 0) {
    return new Map();
  }

  const membersDashboardService = container.get<MembersDashboardService>(TYPES.MembersDashboardService);
  const members = await membersDashboardService.getDirectory(undefined, 1000) as MemberRecord[];

  const memberMap = new Map<string, string>();
  for (const member of members) {
    if (member.id) {
      const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
      memberMap.set(member.id, name || member.email || 'Unknown member');
    }
  }

  return memberMap;
}

// Helper function to get a single member name
async function getMemberName(memberId: string | undefined): Promise<string> {
  if (!memberId) {
    return 'Unknown member';
  }

  const memberMap = await buildMemberNameMap([memberId]);
  return memberMap.get(memberId) || 'Unknown member';
}

// ==================== LIST PAGE HANDLERS ====================

const resolveCarePlansListHero: ServiceDataSourceHandler = async (_request) => {
  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);

  const carePlans = await carePlanService.getCarePlansForTenant();
  const activeCarePlans = await carePlanService.getActiveCarePlansForTenant();
  const upcomingFollowUps = await carePlanService.getUpcomingFollowUpsForTenant();

  return {
    hero: {
      eyebrow: 'Care & Discipleship · Community module',
      headline: 'Member care plan management',
      description: 'Track pastoral care, discipleship journeys, and member follow-ups in one centralized system.',
      metrics: [
        {
          label: 'Total care plans',
          value: carePlans.length.toString(),
          caption: 'All member care plans',
        },
        {
          label: 'Active plans',
          value: activeCarePlans.length.toString(),
          caption: 'Currently active care plans',
        },
        {
          label: 'Upcoming follow-ups',
          value: upcomingFollowUps.length.toString(),
          caption: 'Due in next 7 days',
        },
      ],
    },
  };
};

const resolveCarePlansListTable: ServiceDataSourceHandler = async (_request) => {
  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);

  const carePlans = await carePlanService.getCarePlansForTenant();

  // Fetch member names for all care plans using the dashboard service (has tenant context)
  const memberIds = [...new Set(carePlans.map((cp) => cp.member_id).filter(Boolean))] as string[];
  const memberMap = await buildMemberNameMap(memberIds);

  const rows = carePlans.map((carePlan) => ({
    id: carePlan.id,
    memberName: carePlan.member_id ? memberMap.get(carePlan.member_id) || 'Unknown member' : 'Unknown member',
    status: carePlan.status_label || carePlan.status_code || 'Unknown',
    priority: carePlan.priority || '—',
    assignedTo: carePlan.assigned_to || 'Unassigned',
    followUpAt: carePlan.follow_up_at || '—',
    isActive: carePlan.is_active,
    createdAt: carePlan.created_at,
  }));

  const columns = [
    {
      field: 'memberName',
      headerName: 'Member',
      type: 'link',
      hrefTemplate: '/admin/community/care-plans/{{id}}',
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'badge',
    },
    {
      field: 'priority',
      headerName: 'Priority',
      type: 'text',
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned to',
      type: 'text',
    },
    {
      field: 'followUpAt',
      headerName: 'Follow-up date',
      type: 'date',
    },
    {
      field: 'actions',
      headerName: '',
      type: 'actions',
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      label: 'Member',
      placeholder: 'Search by member or assigned staff...',
    },
    {
      id: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: '', label: 'All statuses' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'on_hold', label: 'On hold' },
      ],
    },
    {
      id: 'priority',
      type: 'select',
      label: 'Priority',
      options: [
        { value: '', label: 'All priorities' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
  ];

  const actions = [
    {
      id: 'view',
      label: 'View',
      type: 'link',
      href: '/admin/community/care-plans/{{id}}',
    },
    {
      id: 'edit',
      label: 'Edit',
      type: 'link',
      href: '/admin/community/care-plans/manage?carePlanId={{id}}',
    },
  ];

  return {
    table: {
      rows,
      columns,
      filters,
      actions,
    },
  };
};

// ==================== MANAGE PAGE HANDLERS ====================

const resolveCarePlanManageHero: ServiceDataSourceHandler = async (request) => {
  const carePlanId = (request.params?.id || request.params?.carePlanId) as string | undefined;

  if (!carePlanId) {
    return {
      hero: {
        eyebrow: 'Add new care plan · Community module',
        headline: 'Create a new member care plan',
        description: 'Set up a care plan to track pastoral care, discipleship, and member follow-ups.',
        metrics: [],
      },
    };
  }

  return {
    hero: {
      eyebrow: 'Edit care plan · Community module',
      headline: 'Update care plan details',
      description: 'Modify care plan information, status, priority, and follow-up schedule.',
      metrics: [],
    },
  };
};

const resolveCarePlanManageForm: ServiceDataSourceHandler = async (request) => {
  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
  const membersDashboardService = container.get<MembersDashboardService>(TYPES.MembersDashboardService);

  const carePlanId = (request.params?.id || request.params?.carePlanId) as string | undefined;
  const isCreate = !carePlanId;

  let carePlan: Partial<MemberCarePlan> = {};

  if (carePlanId) {
    const existingCarePlan = await carePlanService.getCarePlanById(carePlanId);
    if (existingCarePlan) {
      carePlan = existingCarePlan;
    }
  }

  // Fetch members for the dropdown
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

  return {
    form: {
      title: isCreate ? 'Care plan information' : 'Update care plan information',
      description: 'Enter care plan details including status, priority, and follow-up schedule.',
      mode: isCreate ? 'create' : 'edit',
      submitLabel: isCreate ? 'Create care plan' : 'Update care plan',
      contextParams: {
        carePlanId: carePlan.id,
      },
      initialValues: {
        ...(carePlanId ? { carePlanId: carePlan.id } : {}),
        memberId: carePlan.member_id || '',
        statusCode: carePlan.status_code || 'active',
        statusLabel: carePlan.status_label || '',
        assignedTo: carePlan.assigned_to || '',
        followUpAt: carePlan.follow_up_at || '',
        priority: carePlan.priority || 'medium',
        details: carePlan.details || '',
        membershipStageId: carePlan.membership_stage_id || '',
        isActive: carePlan.is_active !== undefined ? (carePlan.is_active ? 'true' : 'false') : 'true',
      },
      fields: [
        // Hidden field to pass care plan ID for updates
        ...(carePlanId ? [{
          name: 'carePlanId',
          type: 'hidden' as const,
        }] : []),
        {
          name: 'memberId',
          label: 'Member',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select member',
          helperText: 'Member this care plan is for',
          required: true,
          options: memberOptions,
        },
        {
          name: 'statusCode',
          label: 'Status',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select status',
          helperText: 'Current status of the care plan',
          required: true,
          options: [
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'on_hold', label: 'On hold' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select priority',
          helperText: 'Priority level for this care plan',
          required: true,
          options: [
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ],
        },
        {
          name: 'assignedTo',
          label: 'Assigned to',
          type: 'text',
          colSpan: 'half',
          placeholder: 'Enter staff member name',
          helperText: 'Staff member responsible for this care plan',
        },
        {
          name: 'followUpAt',
          label: 'Follow-up date',
          type: 'date',
          colSpan: 'half',
          placeholder: 'Select follow-up date',
          helperText: 'Next scheduled follow-up date',
        },
        {
          name: 'isActive',
          label: 'Active status',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select status',
          helperText: 'Whether this care plan is currently active',
          required: true,
          options: [
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ],
        },
        {
          name: 'details',
          label: 'Care plan details',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Enter care plan notes, prayer requests, or action items...',
          helperText: 'Sensitive information (encrypted at rest)',
          rows: 6,
        },
      ],
    },
  };
};

const saveCarePlan: ServiceDataSourceHandler = async (request) => {
  const params = request.params as any;

  // Get tenant context first (following the same pattern as saveHousehold)
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);

  const carePlanId = params.carePlanId as string | undefined;

  // Convert isActive from string to boolean (select dropdown returns 'true'/'false' strings)
  const isActive = params.isActive === 'true' || params.isActive === true;

  const carePlanData: Partial<MemberCarePlan> = {
    tenant_id: tenant.id,
    member_id: params.memberId,
    status_code: params.statusCode,
    status_label: params.statusLabel || null,
    assigned_to: params.assignedTo || null,
    follow_up_at: params.followUpAt || null,
    priority: params.priority || null,
    details: params.details || null,
    membership_stage_id: params.membershipStageId || null,
    is_active: isActive,
  };

  let result: MemberCarePlan;

  if (carePlanId) {
    // Update existing care plan
    result = await carePlanService.updateCarePlan(carePlanId, carePlanData);
  } else {
    // Create new care plan
    result = await carePlanService.createCarePlan(carePlanData);
  }

  return {
    success: true,
    carePlanId: result.id,
    redirect: `/admin/community/care-plans/${result.id}`,
  };
};

// ==================== PROFILE PAGE HANDLERS ====================

const resolveCarePlanProfileHero: ServiceDataSourceHandler = async (request) => {
  const carePlanId = request.params?.carePlanId as string;

  if (!carePlanId) {
    throw new Error('Care plan ID is required');
  }

  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);

  const carePlan = await carePlanService.getCarePlanById(carePlanId);

  if (!carePlan) {
    throw new Error('Care plan not found');
  }

  // Fetch the member name using the dashboard service (has tenant context)
  const memberName = await getMemberName(carePlan.member_id);

  return {
    hero: {
      eyebrow: 'Care plan details · Community module',
      headline: `Care plan for ${memberName}`,
      description: `Status: ${carePlan.status_label || carePlan.status_code} · Priority: ${carePlan.priority || 'Not set'}`,
      metrics: [
        {
          label: 'Status',
          value: carePlan.status_label || carePlan.status_code,
          caption: carePlan.is_active ? 'Active' : 'Inactive',
        },
        {
          label: 'Priority',
          value: carePlan.priority || 'Not set',
          caption: 'Care priority level',
        },
        {
          label: 'Assigned to',
          value: carePlan.assigned_to || 'Unassigned',
          caption: 'Staff member',
        },
      ],
    },
  };
};

const resolveCarePlanProfileSummary: ServiceDataSourceHandler = async (request) => {
  const carePlanId = request.params?.carePlanId as string;

  if (!carePlanId) {
    throw new Error('Care plan ID is required');
  }

  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);

  const carePlan = await carePlanService.getCarePlanById(carePlanId);

  if (!carePlan) {
    throw new Error('Care plan not found');
  }

  // Fetch the member name using the dashboard service (has tenant context)
  const memberName = await getMemberName(carePlan.member_id);

  return {
    summary: {
      panels: [
        {
          id: 'care-plan-info',
          title: 'Care plan details',
          description: 'Basic care plan information',
          columns: 2,
          items: [
            { label: 'Member', value: memberName, type: 'text' },
            { label: 'Status', value: carePlan.status_label || carePlan.status_code, type: 'badge' },
            { label: 'Priority', value: carePlan.priority || '—', type: 'text' },
            { label: 'Assigned to', value: carePlan.assigned_to || 'Unassigned', type: 'text' },
            { label: 'Active', value: carePlan.is_active ? 'Yes' : 'No', type: 'text' },
            { label: 'Membership stage', value: carePlan.membership_stage_id || '—', type: 'text' },
          ],
        },
        {
          id: 'care-plan-dates',
          title: 'Important dates',
          description: 'Schedule and timeline',
          columns: 2,
          items: [
            { label: 'Follow-up date', value: carePlan.follow_up_at ? new Date(carePlan.follow_up_at).toLocaleDateString() : '—', type: 'text' },
            { label: 'Closed date', value: carePlan.closed_at ? new Date(carePlan.closed_at).toLocaleDateString() : '—', type: 'text' },
            { label: 'Created', value: carePlan.created_at ? new Date(carePlan.created_at).toLocaleDateString() : '—', type: 'text' },
            { label: 'Updated', value: carePlan.updated_at ? new Date(carePlan.updated_at).toLocaleDateString() : '—', type: 'text' },
          ],
        },
        {
          id: 'care-plan-notes',
          title: 'Care plan details',
          description: 'Notes and sensitive information (encrypted)',
          columns: 1,
          items: [
            { label: 'Details', value: carePlan.details || 'No details provided', type: 'multiline' },
          ],
        },
      ],
    },
  };
};

// ==================== MEMBER CARE PLANS HANDLER ====================

const resolveMemberCarePlans: ServiceDataSourceHandler = async (request) => {
  const memberId = request.params?.memberId as string;

  if (!memberId) {
    return {
      carePlans: {
        rows: [],
        columns: [],
      },
      carePlansListSection: {
        kind: 'list',
        id: 'member-care-plans-list',
        title: 'Care plans',
        description: 'Care plans associated with this member',
        items: [],
        emptyMessage: 'No care plans found for this member.',
        viewAllHref: '/admin/community/care-plans/list',
        viewAllLabel: 'View all care plans',
      },
    };
  }

  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);

  const carePlans = await carePlanService.getCarePlansByMember(memberId);

  const rows = carePlans.map((carePlan) => ({
    id: carePlan.id,
    status: carePlan.status_label || carePlan.status_code || 'Unknown',
    priority: carePlan.priority || '—',
    assignedTo: carePlan.assigned_to || 'Unassigned',
    followUpAt: carePlan.follow_up_at || '—',
    isActive: carePlan.is_active,
    createdAt: carePlan.created_at,
  }));

  const columns = [
    {
      field: 'status',
      headerName: 'Status',
      type: 'badge',
    },
    {
      field: 'priority',
      headerName: 'Priority',
      type: 'text',
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned to',
      type: 'text',
    },
    {
      field: 'followUpAt',
      headerName: 'Follow-up date',
      type: 'date',
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      type: 'date',
    },
  ];

  const actions = [
    {
      id: 'view',
      label: 'View',
      type: 'link',
      href: '/admin/community/care-plans/{{id}}',
    },
    {
      id: 'edit',
      label: 'Edit',
      type: 'link',
      href: '/admin/community/care-plans/manage?carePlanId={{id}}',
    },
  ];

  // Build list items for the workspace list section
  const listItems = carePlans.map((carePlan) => {
    const status = carePlan.status_label || carePlan.status_code || 'Unknown';
    const priority = carePlan.priority || 'Normal';
    const followUp = carePlan.follow_up_at
      ? `Follow-up: ${new Date(carePlan.follow_up_at).toLocaleDateString()}`
      : null;
    const assignedTo = carePlan.assigned_to ? `Assigned to: ${carePlan.assigned_to}` : null;
    const descriptionParts = [followUp, assignedTo].filter(Boolean);

    return {
      id: carePlan.id,
      label: `${status} - ${priority} priority`,
      description: descriptionParts.length > 0 ? descriptionParts.join(' · ') : null,
      href: `/admin/community/care-plans/${carePlan.id}`,
      badge: carePlan.is_active ? 'Active' : 'Closed',
      badgeVariant: carePlan.is_active ? 'default' : 'secondary',
    };
  });

  return {
    carePlans: {
      rows,
      columns,
      actions,
    },
    carePlansListSection: {
      kind: 'list',
      id: 'member-care-plans-list',
      title: 'Care plans',
      description: 'Care plans associated with this member',
      items: listItems,
      emptyMessage: 'No care plans found for this member.',
      viewAllHref: `/admin/community/care-plans/list?memberId=${memberId}`,
      viewAllLabel: 'View all care plans',
    },
  };
};

// ==================== DASHBOARD CARD HANDLER ====================

const resolveDashboardCarePlansCard: ServiceDataSourceHandler = async (_request) => {
  const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);

  const allCarePlans = await carePlanService.getCarePlansForTenant();
  const activeCarePlans = await carePlanService.getActiveCarePlansForTenant();
  const upcomingFollowUps = await carePlanService.getUpcomingFollowUpsForTenant();

  // Fetch member names for recent care plans using the dashboard service (has tenant context)
  const recentCarePlans = activeCarePlans.slice(0, 5);
  const memberIds = [...new Set(recentCarePlans.map((cp) => cp.member_id).filter(Boolean))] as string[];
  const memberMap = await buildMemberNameMap(memberIds);

  const recentCarePlansWithNames = recentCarePlans.map((carePlan) => ({
    id: carePlan.id,
    memberName: carePlan.member_id ? memberMap.get(carePlan.member_id) || 'Unknown member' : 'Unknown member',
    status: carePlan.status_label || carePlan.status_code || 'Unknown',
    priority: carePlan.priority || 'Medium',
    assignedTo: carePlan.assigned_to || 'Unassigned',
    followUpAt: carePlan.follow_up_at,
    isActive: carePlan.is_active,
  }));

  // Calculate priority breakdown
  const highPriority = activeCarePlans.filter((p) => p.priority === 'high').length;
  const mediumPriority = activeCarePlans.filter((p) => p.priority === 'medium').length;
  const lowPriority = activeCarePlans.filter((p) => p.priority === 'low').length;

  // Return data matching the contract field paths (carePlansCard.title, etc.)
  // The data source id is 'carePlansCard', so the binding path 'carePlansCard.title'
  // resolves to dataScope['carePlansCard']['carePlansCard']['title']
  return {
    carePlansCard: {
      title: 'Member care plans',
      description: 'Active pastoral care and follow-up sequences for your congregation.',
      metrics: [
        {
          label: 'Total plans',
          value: allCarePlans.length.toString(),
          caption: 'All care plans',
        },
        {
          label: 'Active',
          value: activeCarePlans.length.toString(),
          caption: 'Currently in progress',
        },
        {
          label: 'Due this week',
          value: upcomingFollowUps.length.toString(),
          caption: 'Upcoming follow-ups',
        },
      ],
      priorityBreakdown: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority,
      },
      recentItems: recentCarePlansWithNames,
      viewAllUrl: '/admin/community/care-plans/list',
      addNewUrl: '/admin/community/care-plans/manage',
    },
  };
};

// Export all handlers
export const adminCommunityCarePlansHandlers: Record<string, ServiceDataSourceHandler> = {
  'admin-community.careplans.list.hero': resolveCarePlansListHero,
  'admin-community.careplans.list.table': resolveCarePlansListTable,
  'admin-community.careplans.manage.hero': resolveCarePlanManageHero,
  'admin-community.careplans.manage.form': resolveCarePlanManageForm,
  'admin-community.careplans.manage.save': saveCarePlan,
  'admin-community.careplans.profile.hero': resolveCarePlanProfileHero,
  'admin-community.careplans.profile.summary': resolveCarePlanProfileSummary,
  'admin-community.members.careplans': resolveMemberCarePlans,
  'admin-community.dashboard.careplans': resolveDashboardCarePlansCard,
};
