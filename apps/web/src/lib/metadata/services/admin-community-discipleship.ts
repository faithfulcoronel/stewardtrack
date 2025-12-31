/**
 * ================================================================================
 * DISCIPLESHIP PLANS SERVICE HANDLERS - METADATA ARCHITECTURE
 * ================================================================================
 *
 * This file contains service handlers for the discipleship plans metadata pages.
 * Handlers are TypeScript functions that resolve data for XML-defined components.
 *
 * ARCHITECTURE OVERVIEW:
 *
 *   XML Blueprint (DataSource)
 *        |
 *        | <Handler>admin-community.discipleship.list.hero</Handler>
 *        v
 *   Handler Registry (adminCommunityDiscipleshipHandlers)
 *        |
 *        v
 *   Handler Function (resolveDiscipleshipPlansListHero)
 *        |
 *        | Uses DI container to get services
 *        v
 *   Service Layer (MemberDiscipleshipPlanService)
 *        |
 *        v
 *   Repository -> Adapter -> Supabase
 *
 * HANDLER NAMING CONVENTION:
 *   <module>.<feature>.<page>.<datasource>
 *
 *   Examples:
 *     admin-community.discipleship.list.hero    -> List page hero data
 *     admin-community.discipleship.list.table   -> List page table data
 *     admin-community.discipleship.profile.hero -> Profile page hero
 *     admin-community.discipleship.manage.form  -> Manage page form config
 *     admin-community.discipleship.manage.save  -> Save form action
 *
 * HANDLER FUNCTION SIGNATURE:
 *   ServiceDataSourceHandler = (request: ServiceDataSourceRequest) => Promise<any>
 *
 *   Request structure:
 *     {
 *       params: { memberId?, discipleshipPlanId?, ... },  // URL params & search params
 *       config: { value?, limit?, ... },                  // DataSource config from XML
 *       context: { tenant?, role?, locale?, ... }         // Request context
 *     }
 *
 * RETURN DATA STRUCTURE:
 *   Handlers return objects matching the Contract fields in XML.
 *   For example, if Contract has:
 *     <Field name="eyebrow" path="hero.eyebrow"/>
 *
 *   Handler should return:
 *     { hero: { eyebrow: "..." } }
 *
 * ADDING NEW HANDLERS:
 *   1. Create handler function following naming convention
 *   2. Add to export object at bottom of file
 *   3. Register in admin-community.ts handlers object
 *   4. Reference in XML DataSource <Handler> element
 *
 * ================================================================================
 */

import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MemberDiscipleshipPlanService } from '@/services/MemberDiscipleshipPlanService';
import type { MemberDiscipleshipMilestoneService } from '@/services/MemberDiscipleshipMilestoneService';
import type { MembersDashboardService } from '@/services/MembersDashboardService';
import type { TenantService } from '@/services/TenantService';
import type { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';
import { tenantUtils } from '@/utils/tenantUtils';
import { SupabaseAuditService } from '@/services/AuditService';
import {
  createMembershipLookupRequestContext,
  createDiscipleshipPathwayService,
} from './admin-community/membershipLookups';

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Lightweight member record type for name lookups
 */
type MemberRecord = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds a map of member IDs to display names
 *
 * PATTERN: When displaying lists with member references, batch-fetch member
 * names to avoid N+1 queries. The dashboard service respects tenant context.
 *
 * @param memberIds - Array of member UUIDs to look up
 * @returns Map of memberId -> "First Last" display name
 */
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

/**
 * Gets a single member's display name
 *
 * @param memberId - Member UUID to look up
 * @returns Display name or "Unknown member"
 */
async function getMemberName(memberId: string | undefined): Promise<string> {
  if (!memberId) {
    return 'Unknown member';
  }

  const memberMap = await buildMemberNameMap([memberId]);
  return memberMap.get(memberId) || 'Unknown member';
}

// =============================================================================
// LIST PAGE HANDLERS
// =============================================================================

/**
 * Resolves hero section data for the discipleship plans list page.
 *
 * METRICS PATTERN: Hero sections typically show 3-4 aggregate metrics.
 * Each metric has: label (display name), value (number), caption (description)
 *
 * @returns { hero: { eyebrow, headline, description, metrics[] } }
 */
const resolveDiscipleshipPlansListHero: ServiceDataSourceHandler = async (_request) => {
  const discipleshipService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);

  // Fetch aggregate data for metrics
  const allPlans = await discipleshipService.getPlansForTenant();
  const activePlans = allPlans.filter(plan => (!plan.status || plan.status === 'active') && !plan.deleted_at);
  const completedPlans = allPlans.filter(plan => plan.status === 'completed');

  return {
    hero: {
      eyebrow: 'Discipleship & Growth · Community module',
      headline: 'Member discipleship plan management',
      description: 'Track spiritual growth pathways, mentorship relationships, and discipleship milestones in one centralized system.',
      metrics: [
        {
          label: 'Total plans',
          value: allPlans.length.toString(),
          caption: 'All discipleship plans',
        },
        {
          label: 'Active journeys',
          value: activePlans.length.toString(),
          caption: 'Currently in progress',
        },
        {
          label: 'Completed',
          value: completedPlans.length.toString(),
          caption: 'Finished pathways',
        },
      ],
    },
  };
};

/**
 * Resolves table data for the discipleship plans list page.
 *
 * TABLE DATA STRUCTURE:
 *   {
 *     table: {
 *       rows: Array<RowData>,      // Data rows with id and field values
 *       columns: Array<Column>,    // Column definitions
 *       filters: Array<Filter>,    // Filter controls
 *       actions: Array<Action>     // Row actions (view, edit, etc.)
 *     }
 *   }
 *
 * COLUMN TYPES:
 *   - 'link': Clickable text with hrefTemplate
 *   - 'badge': Styled tag (for status)
 *   - 'text': Plain text
 *   - 'date': Formatted date
 *   - 'actions': Row action dropdown
 *
 * FILTER TYPES:
 *   - 'search': Text search input
 *   - 'select': Dropdown with options
 *
 * @returns { table: { rows, columns, filters, actions } }
 */
const resolveDiscipleshipPlansListTable: ServiceDataSourceHandler = async (request) => {
  const discipleshipService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);

  const plans = await discipleshipService.getPlansForTenant();

  // Fetch pathway options from database (dynamic, tenant-scoped)
  const tenantId = await tenantUtils.getTenantId();
  let pathwayOptions: Array<{ value: string; label: string }> = [{ value: '', label: 'All pathways' }];
  if (tenantId) {
    const context = createMembershipLookupRequestContext(tenantId, request.role ?? null);
    const auditService = new SupabaseAuditService();
    const pathwayService = createDiscipleshipPathwayService(context, auditService);
    const pathways = await pathwayService.getActive();
    const dbOptions = pathways.map((p) => ({
      value: p.code ?? '',
      label: p.name ?? '',
    })).filter((opt) => opt.value !== '');
    pathwayOptions = [{ value: '', label: 'All pathways' }, ...dbOptions];
  }

  // Batch fetch member names for all plans
  const memberIds = [...new Set(plans.map((p) => p.member_id).filter(Boolean))] as string[];
  const memberMap = await buildMemberNameMap(memberIds);

  // Transform database records to table rows
  const rows = plans.map((plan) => ({
    id: plan.id,
    memberName: plan.member_id ? memberMap.get(plan.member_id) || 'Unknown member' : 'Unknown member',
    pathway: plan.pathway || '—',
    nextStep: plan.next_step || '—',
    mentor: plan.mentor_name || 'Unassigned',
    status: plan.status || 'active',
    targetDate: plan.target_date,
    createdAt: plan.created_at,
    isActive: !plan.status || plan.status === 'active',
  }));

  // Column definitions for AdminDataGridSection
  const columns = [
    {
      field: 'memberName',
      headerName: 'Member',
      type: 'link',
      hrefTemplate: '/admin/community/discipleship-plans/{{id}}',
    },
    {
      field: 'pathway',
      headerName: 'Pathway',
      type: 'badge',
    },
    {
      field: 'nextStep',
      headerName: 'Next step',
      type: 'text',
    },
    {
      field: 'mentor',
      headerName: 'Mentor',
      type: 'text',
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'badge',
    },
    {
      field: 'actions',
      headerName: '',
      type: 'actions',
    },
  ];

  // Filter definitions
  const filters = [
    {
      id: 'search',
      type: 'search',
      label: 'Search',
      placeholder: 'Search by member or mentor...',
    },
    {
      id: 'pathway',
      type: 'select',
      label: 'Pathway',
      options: pathwayOptions,
    },
    {
      id: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: '', label: 'All statuses' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
      ],
    },
  ];

  // Row actions
  const actions = [
    {
      id: 'view',
      label: 'View',
      type: 'link',
      href: '/admin/community/discipleship-plans/{{id}}',
    },
    {
      id: 'edit',
      label: 'Edit',
      type: 'link',
      href: '/admin/community/discipleship-plans/manage?discipleshipPlanId={{id}}',
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

// =============================================================================
// MANAGE PAGE HANDLERS
// =============================================================================

/**
 * Resolves hero section for the manage (create/edit) page.
 *
 * MODE DETECTION: Check request.params for discipleshipPlanId.
 * - Present: Edit mode, show "Update" messaging
 * - Absent: Create mode, show "Create new" messaging
 *
 * @returns { hero: { eyebrow, headline, description, metrics } }
 */
const resolveDiscipleshipPlanManageHero: ServiceDataSourceHandler = async (request) => {
  const discipleshipPlanId = (request.params?.id || request.params?.discipleshipPlanId) as string | undefined;

  if (!discipleshipPlanId) {
    // CREATE MODE
    return {
      hero: {
        eyebrow: 'Add new plan · Community module',
        headline: 'Create a new discipleship plan',
        description: 'Set up a discipleship journey to track spiritual growth, mentorship, and milestones.',
        metrics: [],
      },
    };
  }

  // EDIT MODE
  return {
    hero: {
      eyebrow: 'Edit plan · Community module',
      headline: 'Update discipleship plan details',
      description: 'Modify pathway, mentor assignment, next steps, and progress tracking.',
      metrics: [],
    },
  };
};

/**
 * Resolves form configuration for create/edit page.
 *
 * FORM STRUCTURE:
 *   {
 *     form: {
 *       title: string,
 *       description: string,
 *       mode: 'create' | 'edit',
 *       submitLabel: string,
 *       contextParams: { discipleshipPlanId?: string },  // Passed to save handler
 *       initialValues: { [fieldName]: value },           // Form defaults
 *       fields: Array<FieldDef>                          // Field definitions
 *     }
 *   }
 *
 * FIELD DEFINITION:
 *   {
 *     name: string,          // Form field name (matches initialValues key)
 *     label: string,         // Display label
 *     type: 'text' | 'select' | 'date' | 'textarea' | 'hidden',
 *     colSpan: 'half' | 'full',
 *     placeholder?: string,
 *     helperText?: string,
 *     required?: boolean,
 *     options?: Array<{ value: string, label: string }>,  // For select
 *     rows?: number,         // For textarea
 *   }
 *
 * @returns { form: FormConfig }
 */
const resolveDiscipleshipPlanManageForm: ServiceDataSourceHandler = async (request) => {
  const discipleshipService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
  const membersDashboardService = container.get<MembersDashboardService>(TYPES.MembersDashboardService);

  const discipleshipPlanId = (request.params?.id || request.params?.discipleshipPlanId) as string | undefined;
  const isCreate = !discipleshipPlanId;

  // Load existing record for edit mode
  let plan: Partial<MemberDiscipleshipPlan> = {};
  if (discipleshipPlanId) {
    const existingPlan = await discipleshipService.getPlanById(discipleshipPlanId);
    if (existingPlan) {
      plan = existingPlan;
    }
  }

  // Fetch members for dropdown (respects tenant context)
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

  // Fetch pathway options from database (dynamic, tenant-scoped)
  // Use manually created service with proper context to avoid DI tenant context issues
  const tenantId = await tenantUtils.getTenantId();
  let pathwayOptions: Array<{ value: string; label: string }> = [];
  if (tenantId) {
    const context = createMembershipLookupRequestContext(tenantId, request.role ?? null);
    const auditService = new SupabaseAuditService();
    const pathwayService = createDiscipleshipPathwayService(context, auditService);
    const pathways = await pathwayService.getActive();
    pathwayOptions = pathways.map((p) => ({
      value: p.code ?? '',
      label: p.name ?? '',
    })).filter((opt) => opt.value !== '');
  }

  return {
    form: {
      title: isCreate ? 'Discipleship plan information' : 'Update plan information',
      description: 'Enter pathway details, mentor assignment, and progress tracking information.',
      mode: isCreate ? 'create' : 'edit',
      submitLabel: isCreate ? 'Create plan' : 'Update plan',
      contextParams: {
        discipleshipPlanId: plan.id,
      },
      initialValues: {
        // Hidden field for updates
        ...(discipleshipPlanId ? { discipleshipPlanId: plan.id } : {}),
        memberId: plan.member_id || '',
        pathway: plan.pathway || '',
        nextStep: plan.next_step || '',
        mentorName: plan.mentor_name || '',
        smallGroup: plan.small_group || '',
        targetDate: plan.target_date || '',
        status: plan.status || 'active',
        notes: plan.notes || '',
      },
      fields: [
        // Hidden ID field for edit mode
        ...(discipleshipPlanId ? [{
          name: 'discipleshipPlanId',
          type: 'hidden' as const,
        }] : []),
        {
          name: 'memberId',
          label: 'Member',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select member',
          helperText: 'Member this discipleship plan is for',
          required: true,
          options: memberOptions,
        },
        {
          name: 'pathway',
          label: 'Pathway',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select pathway',
          helperText: 'Discipleship pathway or track',
          required: true,
          options: pathwayOptions,
          // Required for quick-create functionality
          lookupId: 'discipleship_pathway',
          // Quick-create button configuration for adding new pathways
          quickCreate: {
            label: 'Add pathway',
            description: 'Add a new discipleship pathway to your church configuration.',
            submitLabel: 'Create pathway',
            successMessage: 'Pathway created successfully',
            action: {
              id: 'quick-create-discipleship-pathway',
              kind: 'metadata.service',
              config: {
                handler: 'admin-community.discipleship.pathway.create',
                lookupId: 'discipleship_pathway',
              },
            },
          },
        },
        {
          name: 'mentorName',
          label: 'Mentor',
          type: 'text',
          colSpan: 'half',
          placeholder: 'Enter mentor name',
          helperText: 'Assigned mentor or discipler',
        },
        {
          name: 'smallGroup',
          label: 'Small group',
          type: 'text',
          colSpan: 'half',
          placeholder: 'Enter small group name',
          helperText: 'Associated small group (if any)',
        },
        {
          name: 'nextStep',
          label: 'Next step',
          type: 'text',
          colSpan: 'half',
          placeholder: 'Enter next action step',
          helperText: 'Current next step in the journey',
        },
        {
          name: 'targetDate',
          label: 'Target date',
          type: 'date',
          colSpan: 'half',
          placeholder: 'Select target date',
          helperText: 'Target completion date for this pathway',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select status',
          helperText: 'Current status of the plan',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
            { value: 'completed', label: 'Completed' },
          ],
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'richtext',
          colSpan: 'full',
          placeholder: 'Enter additional notes, prayer requests, or observations...',
          helperText: 'Private notes about this discipleship journey',
        },
      ],
    },
  };
};

/**
 * Saves a discipleship plan (create or update).
 *
 * SAVE HANDLER PATTERN:
 *   1. Get tenant context (required for multi-tenant data)
 *   2. Extract form values from request.params
 *   3. Transform/validate data as needed
 *   4. Call service to create or update
 *   5. Return { success, discipleshipPlanId, redirect }
 *
 * The returned discipleshipPlanId is used in the OnSuccess Navigate URL.
 *
 * @returns { success: boolean, discipleshipPlanId: string, redirect: string }
 */
const saveDiscipleshipPlan: ServiceDataSourceHandler = async (request) => {
  const params = request.params as any;

  // Get tenant context (required for all database operations)
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const discipleshipService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
  const discipleshipPlanId = params.discipleshipPlanId as string | undefined;

  // Build plan data from form params
  const planData: Partial<MemberDiscipleshipPlan> = {
    tenant_id: tenant.id,
    member_id: params.memberId,
    pathway: params.pathway || null,
    next_step: params.nextStep || null,
    mentor_name: params.mentorName || null,
    small_group: params.smallGroup || null,
    target_date: params.targetDate || null,
    status: params.status || 'active',
    notes: params.notes || null,
  };

  let result: MemberDiscipleshipPlan;

  if (discipleshipPlanId) {
    // UPDATE existing plan
    result = await discipleshipService.updatePlan(discipleshipPlanId, planData);
  } else {
    // CREATE new plan
    result = await discipleshipService.createPlan(planData);
  }

  return {
    success: true,
    discipleshipPlanId: result.id,
    redirect: `/admin/community/discipleship-plans/${result.id}`,
  };
};

// =============================================================================
// PROFILE PAGE HANDLERS
// =============================================================================

/**
 * Resolves hero section for the profile (detail) page.
 *
 * PROFILE HERO PATTERN:
 *   - Dynamic headline with member name
 *   - Status/pathway in description
 *   - Key metrics (pathway stage, mentor, milestones)
 *
 * @returns { hero: { eyebrow, headline, description, metrics } }
 */
const resolveDiscipleshipPlanProfileHero: ServiceDataSourceHandler = async (request) => {
  const discipleshipPlanId = request.params?.discipleshipPlanId as string;

  if (!discipleshipPlanId) {
    throw new Error('Discipleship plan ID is required');
  }

  const discipleshipService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
  const plan = await discipleshipService.getPlanById(discipleshipPlanId);

  if (!plan) {
    throw new Error('Discipleship plan not found');
  }

  // Get member name for headline
  const memberName = await getMemberName(plan.member_id);

  // Determine status display
  const statusLabel = plan.status === 'completed' ? 'Completed' : (plan.status === 'paused' ? 'Paused' : 'Active');
  const statusCaption = plan.status === 'completed' ? 'Journey completed' : 'Active journey';

  return {
    hero: {
      eyebrow: 'Discipleship plan details · Community module',
      headline: `Discipleship plan for ${memberName}`,
      description: `Pathway: ${plan.pathway || 'Not set'} · Status: ${statusLabel}`,
      metrics: [
        {
          label: 'Pathway',
          value: plan.pathway || 'Not set',
          caption: 'Current pathway',
        },
        {
          label: 'Mentor',
          value: plan.mentor_name || 'Unassigned',
          caption: 'Assigned mentor',
        },
        {
          label: 'Status',
          value: statusLabel,
          caption: statusCaption,
        },
      ],
    },
  };
};

/**
 * Resolves summary panels for the profile page.
 *
 * SUMMARY PANELS PATTERN:
 *   Each panel contains related fields grouped logically.
 *   Common panel types:
 *     - Basic information
 *     - Dates and timeline
 *     - Notes and details
 *
 * ITEM TYPES:
 *   - 'text': Plain text display
 *   - 'badge': Styled status badge
 *   - 'date': Formatted date
 *   - 'multiline': Multi-line text (for notes)
 *   - 'link': Clickable link
 *
 * @returns { summary: { panels: Panel[] } }
 */
const resolveDiscipleshipPlanProfileSummary: ServiceDataSourceHandler = async (request) => {
  const discipleshipPlanId = request.params?.discipleshipPlanId as string;

  if (!discipleshipPlanId) {
    throw new Error('Discipleship plan ID is required');
  }

  const discipleshipService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
  const plan = await discipleshipService.getPlanById(discipleshipPlanId);

  if (!plan) {
    throw new Error('Discipleship plan not found');
  }

  // Get member name for display
  const memberName = await getMemberName(plan.member_id);
  const statusLabel = plan.status === 'completed' ? 'Completed' : (plan.status === 'paused' ? 'Paused' : 'Active');

  return {
    summary: {
      panels: [
        {
          id: 'plan-info',
          title: 'Plan details',
          description: 'Basic discipleship plan information',
          columns: 2,
          items: [
            { label: 'Member', value: memberName, type: 'text' },
            { label: 'Pathway', value: plan.pathway || '—', type: 'badge' },
            { label: 'Status', value: statusLabel, type: 'badge' },
            { label: 'Mentor', value: plan.mentor_name || 'Unassigned', type: 'text' },
            { label: 'Small group', value: plan.small_group || '—', type: 'text' },
            { label: 'Next step', value: plan.next_step || '—', type: 'text' },
          ],
        },
        {
          id: 'plan-dates',
          title: 'Timeline',
          description: 'Journey dates and milestones',
          columns: 2,
          items: [
            {
              label: 'Target date',
              value: plan.target_date ? new Date(plan.target_date).toLocaleDateString() : '—',
              type: 'text',
            },
            {
              label: 'Created',
              value: plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '—',
              type: 'text',
            },
            {
              label: 'Last updated',
              value: plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : '—',
              type: 'text',
            },
          ],
        },
        {
          id: 'plan-notes',
          title: 'Notes',
          description: 'Additional information and observations',
          columns: 1,
          items: [
            { label: 'Notes', value: plan.notes || 'No notes provided', type: 'multiline' },
          ],
        },
      ],
    },
  };
};

// =============================================================================
// MEMBER DISCIPLESHIP PLANS HANDLER (for member profile integration)
// =============================================================================

/**
 * Resolves discipleship plans for a specific member.
 *
 * This handler is used on the member profile page to show their discipleship plans.
 * Returns both table data (rows, columns) and list section data (for workspace).
 *
 * @returns { discipleshipPlans: TableData, discipleshipPlansListSection: ListSection }
 */
const resolveMemberDiscipleshipPlans: ServiceDataSourceHandler = async (request) => {
  const memberId = request.params?.memberId as string;

  if (!memberId) {
    return {
      discipleshipPlans: {
        rows: [],
        columns: [],
      },
      discipleshipPlansListSection: {
        kind: 'list',
        id: 'member-discipleship-plans-list',
        title: 'Discipleship plans',
        description: 'Discipleship journeys for this member',
        items: [],
        emptyMessage: 'No discipleship plans found for this member.',
        viewAllHref: '/admin/community/discipleship-plans/list',
        viewAllLabel: 'View all plans',
      },
    };
  }

  const discipleshipService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);
  const plans = await discipleshipService.getPlansByMember(memberId);

  const rows = plans.map((plan) => ({
    id: plan.id,
    pathway: plan.pathway || '—',
    nextStep: plan.next_step || '—',
    mentor: plan.mentor_name || 'Unassigned',
    status: plan.status || 'active',
    targetDate: plan.target_date,
    isActive: !plan.status || plan.status === 'active',
  }));

  const columns = [
    { field: 'pathway', headerName: 'Pathway', type: 'badge' },
    { field: 'nextStep', headerName: 'Next step', type: 'text' },
    { field: 'mentor', headerName: 'Mentor', type: 'text' },
    { field: 'status', headerName: 'Status', type: 'badge' },
  ];

  const actions = [
    { id: 'view', label: 'View', type: 'link', href: '/admin/community/discipleship-plans/{{id}}' },
    { id: 'edit', label: 'Edit', type: 'link', href: '/admin/community/discipleship-plans/manage?discipleshipPlanId={{id}}' },
  ];

  // Build list items for workspace section
  const listItems = plans.map((plan) => {
    const statusLabel = plan.status === 'completed' ? 'Completed' : (plan.status === 'paused' ? 'Paused' : 'Active');
    const pathway = plan.pathway || 'Custom journey';
    const mentor = plan.mentor_name ? `Mentor: ${plan.mentor_name}` : null;
    const nextStep = plan.next_step ? `Next: ${plan.next_step}` : null;
    const descriptionParts = [mentor, nextStep].filter(Boolean);

    return {
      id: plan.id,
      label: `${pathway} - ${statusLabel}`,
      description: descriptionParts.length > 0 ? descriptionParts.join(' · ') : null,
      href: `/admin/community/discipleship-plans/${plan.id}`,
      badge: statusLabel,
      badgeVariant: plan.status === 'completed' ? 'secondary' : 'default',
    };
  });

  return {
    discipleshipPlans: {
      rows,
      columns,
      actions,
    },
    discipleshipPlansListSection: {
      kind: 'list',
      id: 'member-discipleship-plans-list',
      title: 'Discipleship plans',
      description: 'Discipleship journeys for this member',
      items: listItems,
      emptyMessage: 'No discipleship plans found for this member.',
      viewAllHref: `/admin/community/discipleship-plans/list?memberId=${memberId}`,
      viewAllLabel: 'View all plans',
    },
  };
};

// =============================================================================
// DASHBOARD CARD HANDLER
// =============================================================================

/**
 * Resolves discipleship plans card data for the community dashboard.
 *
 * DASHBOARD CARD PATTERN:
 *   - Title and description
 *   - Aggregate metrics
 *   - Recent items list
 *   - Action URLs (view all, add new)
 *
 * @returns { discipleshipPlansCard: DashboardCardData }
 */
const resolveDashboardDiscipleshipPlansCard: ServiceDataSourceHandler = async (_request) => {
  const discipleshipService = container.get<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService);

  const allPlans = await discipleshipService.getPlansForTenant();
  const activePlans = allPlans.filter(plan => (!plan.status || plan.status === 'active') && !plan.deleted_at);
  const completedPlans = allPlans.filter(plan => plan.status === 'completed');

  // Get recent active plans
  const recentPlans = activePlans.slice(0, 5);
  const memberIds = [...new Set(recentPlans.map((p) => p.member_id).filter(Boolean))] as string[];
  const memberMap = await buildMemberNameMap(memberIds);

  const recentItems = recentPlans.map((plan) => ({
    id: plan.id,
    memberName: plan.member_id ? memberMap.get(plan.member_id) || 'Unknown member' : 'Unknown member',
    pathway: plan.pathway || 'Custom',
    mentor: plan.mentor_name || 'Unassigned',
    nextStep: plan.next_step,
    targetDate: plan.target_date,
  }));

  // Pathway breakdown
  const pathwayBreakdown: Record<string, number> = {};
  for (const plan of activePlans) {
    const pathway = plan.pathway || 'other';
    pathwayBreakdown[pathway] = (pathwayBreakdown[pathway] || 0) + 1;
  }

  return {
    discipleshipPlansCard: {
      title: 'Discipleship plans',
      description: 'Active spiritual growth journeys and pathway tracking.',
      metrics: [
        { label: 'Total plans', value: allPlans.length.toString(), caption: 'All plans' },
        { label: 'Active', value: activePlans.length.toString(), caption: 'In progress' },
        { label: 'Completed', value: completedPlans.length.toString(), caption: 'Finished' },
      ],
      pathwayBreakdown,
      recentItems,
      viewAllUrl: '/admin/community/discipleship-plans/list',
      addNewUrl: '/admin/community/discipleship-plans/manage',
    },
  };
};

// =============================================================================
// PATHWAY QUICK-CREATE HANDLER
// =============================================================================

/**
 * Creates a new discipleship pathway from the quick-create dialog.
 *
 * This handler is called by AdminLookupQuickCreate when user clicks the "+"
 * button next to the pathway select field.
 *
 * Uses the membership lookup pattern with manually created service instance
 * to ensure proper tenant context.
 *
 * Input (from form):
 *   { lookupId: 'discipleship_pathway', name: string, code: string }
 *
 * Returns:
 *   { option: { id: string, value: string } } - For dropdown update
 */
const createDiscipleshipPathway: ServiceDataSourceHandler = async (request) => {
  const params = request.params as { name?: string; code?: string; lookupId?: string };

  const name = params.name?.trim();
  const code = params.code?.trim();

  if (!name) {
    throw new Error('Pathway name is required');
  }

  if (!code) {
    throw new Error('Pathway code is required');
  }

  // Validate code format (lowercase with underscores/hyphens)
  const codePattern = /^[a-z][a-z0-9_-]*$/;
  if (!codePattern.test(code)) {
    throw new Error('Code must start with a letter and contain only lowercase letters, numbers, underscores, and hyphens');
  }

  // Get tenant context using the same pattern as resolveDiscipleshipPlanManageForm
  const tenantId = await tenantUtils.getTenantId();
  if (!tenantId) {
    throw new Error('No tenant context available');
  }

  // Create service instance with proper context (following membership lookup pattern)
  const context = createMembershipLookupRequestContext(tenantId, request.role ?? null);
  const auditService = new SupabaseAuditService();
  const pathwayService = createDiscipleshipPathwayService(context, auditService);

  // Get current pathways to check for duplicates and determine max order
  const pathways = await pathwayService.getActive();

  // Check for duplicate code
  const existing = pathways.find((p) => p.code === code);
  if (existing) {
    throw new Error(`A pathway with code '${code}' already exists`);
  }

  // Get max display_order to append at end
  const maxOrder = pathways.reduce((max, p) => Math.max(max, p.display_order || 0), 0);

  // Create the pathway
  const pathway = await pathwayService.create({
    name,
    code,
    display_order: maxOrder + 1,
    is_active: true,
  });

  // Return in the format expected by AdminLookupQuickCreate
  // The component looks for data.option.id and data.option.value
  return {
    success: true,
    option: {
      id: pathway.code, // Use code as the ID since that's what the form stores
      value: pathway.name, // Display label
    },
  };
};

// =============================================================================
// HANDLER EXPORT
// =============================================================================

// =============================================================================
// MILESTONE HANDLERS
// =============================================================================

/**
 * Get milestones for a specific discipleship plan
 * Handler ID: admin-community.discipleship.milestones.list
 */
const resolveDiscipleshipPlanMilestones: ServiceDataSourceHandler = async (request) => {
  const planId = typeof request.params?.discipleshipPlanId === 'string'
    ? request.params.discipleshipPlanId
    : '';

  if (!planId) {
    return { milestones: [] };
  }

  const milestoneService = container.get<MemberDiscipleshipMilestoneService>(
    TYPES.MemberDiscipleshipMilestoneService
  );

  const milestones = await milestoneService.getMilestonesForPlan(planId);

  return {
    milestones: milestones.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description || '',
      milestoneDate: m.milestone_date || null,
      celebratedAt: m.celebrated_at || null,
      isCelebrated: !!m.celebrated_at,
      notes: m.notes || '',
    })),
  };
};

/**
 * Get milestones for a specific member (across all plans)
 * Handler ID: admin-community.discipleship.member.milestones
 */
const resolveMemberDiscipleshipMilestones: ServiceDataSourceHandler = async (request) => {
  const memberId = typeof request.params?.memberId === 'string'
    ? request.params.memberId
    : '';

  if (!memberId) {
    return { milestones: [] };
  }

  const milestoneService = container.get<MemberDiscipleshipMilestoneService>(
    TYPES.MemberDiscipleshipMilestoneService
  );

  const milestones = await milestoneService.getMilestonesForMember(memberId);

  return {
    milestones: milestones.map((m) => ({
      id: m.id,
      planId: m.plan_id || null,
      name: m.name,
      description: m.description || '',
      milestoneDate: m.milestone_date || null,
      celebratedAt: m.celebrated_at || null,
      isCelebrated: !!m.celebrated_at,
      notes: m.notes || '',
    })),
  };
};

/**
 * Save (create or update) a discipleship milestone
 * Handler ID: admin-community.discipleship.milestones.save
 */
const saveDiscipleshipMilestone: ServiceDataSourceHandler = async (request) => {
  const params = request.params || {};
  const milestoneId = typeof params.milestoneId === 'string' ? params.milestoneId : null;
  const planId = typeof params.planId === 'string' ? params.planId : null;
  const memberId = typeof params.memberId === 'string' ? params.memberId : null;
  const name = typeof params.name === 'string' ? params.name : '';
  const description = typeof params.description === 'string' ? params.description : null;
  const milestoneDate = typeof params.milestoneDate === 'string' ? params.milestoneDate : null;
  const notes = typeof params.notes === 'string' ? params.notes : null;

  if (!memberId) {
    throw new Error('Member ID is required');
  }

  if (!name) {
    throw new Error('Milestone name is required');
  }

  const milestoneService = container.get<MemberDiscipleshipMilestoneService>(
    TYPES.MemberDiscipleshipMilestoneService
  );

  const milestoneData = {
    member_id: memberId,
    plan_id: planId,
    name,
    description,
    milestone_date: milestoneDate,
    notes,
  };

  let result;
  if (milestoneId) {
    // Update existing milestone
    result = await milestoneService.updateMilestone(milestoneId, milestoneData);
  } else {
    // Create new milestone
    result = await milestoneService.createMilestone(milestoneData);
  }

  return {
    success: true,
    milestoneId: result.id,
    message: milestoneId ? 'Milestone updated successfully' : 'Milestone created successfully',
  };
};

/**
 * Celebrate a milestone
 * Handler ID: admin-community.discipleship.milestones.celebrate
 */
const celebrateDiscipleshipMilestone: ServiceDataSourceHandler = async (request) => {
  const milestoneId = typeof request.params?.milestoneId === 'string'
    ? request.params.milestoneId
    : '';
  const notes = typeof request.params?.notes === 'string'
    ? request.params.notes
    : undefined;

  if (!milestoneId) {
    throw new Error('Milestone ID is required');
  }

  const milestoneService = container.get<MemberDiscipleshipMilestoneService>(
    TYPES.MemberDiscipleshipMilestoneService
  );

  const result = await milestoneService.celebrateMilestone(milestoneId, notes);

  return {
    success: true,
    milestoneId: result.id,
    celebratedAt: result.celebrated_at,
    message: 'Milestone celebrated!',
  };
};

/**
 * Delete a milestone
 * Handler ID: admin-community.discipleship.milestones.delete
 */
const deleteDiscipleshipMilestone: ServiceDataSourceHandler = async (request) => {
  const milestoneId = typeof request.params?.milestoneId === 'string'
    ? request.params.milestoneId
    : '';

  if (!milestoneId) {
    throw new Error('Milestone ID is required');
  }

  const milestoneService = container.get<MemberDiscipleshipMilestoneService>(
    TYPES.MemberDiscipleshipMilestoneService
  );

  await milestoneService.deleteMilestone(milestoneId);

  return {
    success: true,
    message: 'Milestone deleted successfully',
  };
};

/**
 * Export all discipleship plan handlers.
 *
 * REGISTRATION: These handlers must be imported and spread into
 * adminCommunityHandlers in src/lib/metadata/services/admin-community.ts
 *
 * Example:
 *   import { adminCommunityDiscipleshipHandlers } from './admin-community-discipleship';
 *
 *   export const adminCommunityHandlers = {
 *     ...adminCommunityDiscipleshipHandlers,
 *     ...otherHandlers,
 *   };
 */
export const adminCommunityDiscipleshipHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-community.discipleship.list.hero': resolveDiscipleshipPlansListHero,
  'admin-community.discipleship.list.table': resolveDiscipleshipPlansListTable,

  // Manage page handlers
  'admin-community.discipleship.manage.hero': resolveDiscipleshipPlanManageHero,
  'admin-community.discipleship.manage.form': resolveDiscipleshipPlanManageForm,
  'admin-community.discipleship.manage.save': saveDiscipleshipPlan,

  // Profile page handlers
  'admin-community.discipleship.profile.hero': resolveDiscipleshipPlanProfileHero,
  'admin-community.discipleship.profile.summary': resolveDiscipleshipPlanProfileSummary,

  // Integration handlers (for member profile, dashboard)
  'admin-community.members.discipleship': resolveMemberDiscipleshipPlans,
  'admin-community.dashboard.discipleship': resolveDashboardDiscipleshipPlansCard,

  // Pathway quick-create handler
  'admin-community.discipleship.pathway.create': createDiscipleshipPathway,

  // Milestone handlers
  'admin-community.discipleship.milestones.list': resolveDiscipleshipPlanMilestones,
  'admin-community.discipleship.member.milestones': resolveMemberDiscipleshipMilestones,
  'admin-community.discipleship.milestones.save': saveDiscipleshipMilestone,
  'admin-community.discipleship.milestones.celebrate': celebrateDiscipleshipMilestone,
  'admin-community.discipleship.milestones.delete': deleteDiscipleshipMilestone,
};
