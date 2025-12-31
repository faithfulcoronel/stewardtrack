import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { MemberHousehold } from '@/models/memberHousehold.model';
import type { MemberHouseholdService } from '@/services/MemberHouseholdService';

// ==================== LIST PAGE HANDLERS ====================

const resolveHouseholdsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const householdService = container.get<MemberHouseholdService>(TYPES.MemberHouseholdService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const households = await householdService.getHouseholdsByTenant(tenant.id);
  const totalCount = households.length;
  const withMembers = households.filter(h => h.member_names && h.member_names.length > 0).length;
  const recentCount = households.filter(h => {
    const createdAt = h.created_at ? new Date(h.created_at) : null;
    if (!createdAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt > thirtyDaysAgo;
  }).length;

  return {
    hero: {
      eyebrow: 'Household operations',
      headline: 'Manage household records and addresses',
      description: 'Track family units and household addresses in one centralized directory.',
      metrics: [
        {
          label: 'Total households',
          value: totalCount.toString(),
          caption: 'Active household records',
        },
        {
          label: 'With members',
          value: withMembers.toString(),
          caption: 'Households with assigned members',
        },
        {
          label: 'New this month',
          value: recentCount.toString(),
          caption: 'Recently created households',
        },
      ],
    },
  };
};

const resolveHouseholdsListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const householdService = container.get<MemberHouseholdService>(TYPES.MemberHouseholdService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const households = await householdService.getHouseholdsByTenant(tenant.id);

  const rows = households.map((household) => ({
    id: household.id,
    name: household.name || 'Unnamed Household',
    address: [
      household.address_street,
      household.address_city,
      household.address_state,
      household.address_postal_code,
    ].filter(Boolean).join(', ') || '—',
    memberCount: household.member_names?.length || 0,
    notes: household.notes || '—',
    createdAt: household.created_at,
  }));

  const columns = [
    {
      field: 'name',
      headerName: 'Household name',
      type: 'link',
      hrefTemplate: '/admin/community/households/{{id}}',
    },
    {
      field: 'address',
      headerName: 'Address',
      type: 'text',
    },
    {
      field: 'memberCount',
      headerName: 'Members',
      type: 'text',
    },
    {
      field: 'notes',
      headerName: 'Notes',
      type: 'text',
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search by name or address...',
    },
  ];

  const actions = [
    {
      id: 'view',
      label: 'View',
      type: 'link',
      href: '/admin/community/households/{{id}}',
    },
    {
      id: 'edit',
      label: 'Edit',
      type: 'link',
      href: '/admin/community/households/manage?householdId={{id}}',
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

const resolveHouseholdManageHero: ServiceDataSourceHandler = async (request) => {
  // The household ID can come from either params.id (query string) or params.householdId (route param)
  const householdId = (request.params?.id || request.params?.householdId) as string | undefined;

  if (!householdId) {
    return {
      hero: {
        eyebrow: 'Add new household · Community module',
        headline: 'Create a new household record',
        description: 'Set up household information and address details.',
        metrics: [
          { label: 'Mode', value: 'Create new record', caption: 'Household ID assigned after save' },
          { label: 'Status', value: 'Active', caption: 'Default status' },
          { label: 'Members', value: '0', caption: 'Add members after creation' },
        ],
      },
    };
  }

  // Get tenant context for secure query
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const householdService = container.get<MemberHouseholdService>(TYPES.MemberHouseholdService);
  const household = await householdService.getHouseholdByIdAndTenant(householdId, tenant.id);

  if (!household) {
    throw new Error('Household not found');
  }

  const memberCount = household.member_names?.length || 0;

  return {
    hero: {
      eyebrow: 'Edit household · Community module',
      headline: `Update ${household.name || 'household'} record`,
      description: 'Modify household information and address details.',
      metrics: [
        { label: 'Mode', value: 'Edit existing record', caption: `Household ID ${household.id}` },
        { label: 'Members', value: memberCount.toString(), caption: 'Household members' },
        { label: 'Created', value: household.created_at ? new Date(household.created_at).toLocaleDateString() : '—', caption: 'Record created' },
      ],
    },
  };
};

const resolveHouseholdManageForm: ServiceDataSourceHandler = async (request) => {
  // The household ID can come from either params.id (query string) or params.householdId (route param)
  const householdId = (request.params?.id || request.params?.householdId) as string | undefined;
  const isCreate = !householdId;

  // Get tenant context first (needed for both create and edit modes)
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let household: Partial<MemberHousehold> = {};

  if (householdId) {
    const householdService = container.get<MemberHouseholdService>(TYPES.MemberHouseholdService);
    const existingHousehold = await householdService.getHouseholdByIdAndTenant(householdId, tenant.id);
    if (existingHousehold) {
      household = existingHousehold;
    }
  }

  return {
    form: {
      title: isCreate ? 'Household information' : 'Update household information',
      description: 'Enter household details and address information.',
      mode: isCreate ? 'create' : 'edit',
      submitLabel: isCreate ? 'Create household' : 'Update household',
      contextParams: {
        householdId: household.id,
        tenantId: tenant?.id,
      },
      initialValues: {
        ...(householdId ? { householdId: household.id } : {}),
        name: household.name || '',
        addressStreet: household.address_street || '',
        addressCity: household.address_city || '',
        addressState: household.address_state || '',
        addressPostalCode: household.address_postal_code || '',
        notes: household.notes || '',
      },
      fields: [
        // Hidden field to pass household ID for updates
        ...(householdId ? [{
          name: 'householdId',
          type: 'hidden' as const,
        }] : []),
        {
          name: 'name',
          label: 'Household name',
          type: 'text',
          colSpan: 'full',
          placeholder: 'Smith Family',
          helperText: 'Primary household identifier',
          required: true,
        },
        {
          name: 'addressStreet',
          label: 'Street address',
          type: 'text',
          colSpan: 'full',
          placeholder: '123 Main Street',
          helperText: 'Household street address',
        },
        {
          name: 'addressCity',
          label: 'City',
          type: 'text',
          colSpan: 'third',
          placeholder: 'Manila',
          helperText: 'City name',
        },
        {
          name: 'addressState',
          label: 'State/Province',
          type: 'text',
          colSpan: 'third',
          placeholder: 'Metro Manila',
          helperText: 'State or province',
        },
        {
          name: 'addressPostalCode',
          label: 'Postal code',
          type: 'text',
          colSpan: 'third',
          placeholder: '1000',
          helperText: 'ZIP or postal code',
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Additional household information...',
          helperText: 'Internal notes about this household',
          rows: 4,
        },
      ],
    },
  };
};

const saveHousehold: ServiceDataSourceHandler = async (request) => {
  const params = request.params as any;

  console.log('[saveHousehold] Full request object:', JSON.stringify({
    params: params,
    config: request.config,
    id: request.id,
  }, null, 2));

  // The household ID can come from multiple sources when editing:
  // - params.householdId (from contextParams in the form)
  // - params.id (from query string if present)
  // - config.householdId (from form metadata)
  const householdId = (params.householdId || params.id || request.config?.householdId) as string | undefined;

  console.log('[saveHousehold] Attempting to save household. ID:', householdId, 'Mode:', householdId ? 'update' : 'create');

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const householdService = container.get<MemberHouseholdService>(TYPES.MemberHouseholdService);

    const householdData: Partial<MemberHousehold> = {
      tenant_id: tenant.id,
      name: params.name as string,
      address_street: params.addressStreet ? (params.addressStreet as string) : null,
      address_city: params.addressCity ? (params.addressCity as string) : null,
      address_state: params.addressState ? (params.addressState as string) : null,
      address_postal_code: params.addressPostalCode ? (params.addressPostalCode as string) : null,
      notes: params.notes ? (params.notes as string) : null,
    };

    console.log('[saveHousehold] Household data to save:', JSON.stringify(householdData, null, 2));

    let household: MemberHousehold;

    if (householdId) {
      console.log('[saveHousehold] Updating household:', householdId);
      household = await householdService.updateHousehold(householdId, householdData);
    } else {
      console.log('[saveHousehold] Creating new household');
      household = await householdService.createHousehold(householdData);
    }

    console.log('[saveHousehold] Household saved successfully:', household.id, 'Name:', household.name);

    return {
      success: true,
      message: householdId ? 'Household updated successfully' : 'Household created successfully',
      householdId: household.id,
    };
  } catch (error: any) {
    console.error('[saveHousehold] Failed to save household:', error);

    // Parse database constraint errors to provide meaningful messages
    const errorMessage = error?.message?.trim() || '';
    let userMessage = 'Something went wrong while saving the household. Please try again.';

    if (errorMessage.includes('null value in column') && errorMessage.includes('violates not-null constraint')) {
      const columnMatch = errorMessage.match(/column "([^"]+)"/);
      const columnName = columnMatch ? columnMatch[1] : 'a required field';
      userMessage = `The ${columnName} field is required but was not provided. Please ensure all required fields are filled in.`;
    } else if (errorMessage.includes('duplicate key value violates unique constraint')) {
      userMessage = 'A household with this information already exists. Please check for duplicates.';
    } else if (errorMessage.includes('violates foreign key constraint')) {
      userMessage = 'The selected option is no longer valid. Please refresh the page and try again.';
    } else if (errorMessage && !errorMessage.includes('SupabaseClient') && !errorMessage.includes('undefined') && errorMessage.length < 200) {
      // Use the actual error message if it's meaningful (not too technical)
      userMessage = errorMessage;
    }

    return {
      success: false,
      message: userMessage,
      errors: {
        formErrors: [userMessage],
      },
    };
  }
};

// ==================== PROFILE PAGE HANDLERS ====================

/**
 * Request-scoped cache for household data to prevent redundant fetches
 * Each household ID maps to a promise to handle concurrent requests
 */
const householdProfileCache = new Map<string, Promise<MemberHousehold>>();

/**
 * Shared helper to fetch household data once per request
 * Uses caching to prevent redundant database calls and auth validations
 */
const fetchHouseholdForProfile = async (householdId: string): Promise<MemberHousehold> => {
  // Check if we already have a pending or completed fetch for this household
  const cached = householdProfileCache.get(householdId);
  if (cached) {
    console.log('[fetchHouseholdForProfile] Using cached household data for ID:', householdId);
    return cached;
  }

  console.log('[fetchHouseholdForProfile] Fetching household data for ID:', householdId);

  // Create a promise for this fetch and cache it immediately
  const fetchPromise = (async () => {
    try {
      // Get tenant context once
      const tenantService = container.get<TenantService>(TYPES.TenantService);
      const tenant = await tenantService.getCurrentTenant();
      if (!tenant) {
        throw new Error('No tenant context available');
      }

      console.log('[fetchHouseholdForProfile] Tenant context resolved:', tenant.id);

      // Fetch household once with tenant-scoped method
      const householdService = container.get<MemberHouseholdService>(TYPES.MemberHouseholdService);
      const household = await householdService.getHouseholdByIdAndTenant(householdId, tenant.id);

      console.log('[fetchHouseholdForProfile] Household fetched:', household?.id);

      if (!household) {
        throw new Error('Household not found');
      }

      // Schedule cache cleanup after 5 seconds to prevent memory leaks
      setTimeout(() => {
        householdProfileCache.delete(householdId);
        console.log('[fetchHouseholdForProfile] Cache cleaned for household:', householdId);
      }, 5000);

      return household;
    } catch (error) {
      // Remove from cache on error so retry is possible
      householdProfileCache.delete(householdId);
      throw error;
    }
  })();

  householdProfileCache.set(householdId, fetchPromise);
  return fetchPromise;
};

const resolveHouseholdProfileHero: ServiceDataSourceHandler = async (request) => {
  const householdId = request.params?.householdId as string;

  if (!householdId) {
    throw new Error('Household ID is required');
  }

  // Fetch household data using shared helper
  const household = await fetchHouseholdForProfile(householdId);

  const memberCount = household.member_names?.length || 0;
  const fullAddress = [
    household.address_street,
    household.address_city,
    household.address_state,
    household.address_postal_code,
  ].filter(Boolean).join(', ') || 'No address on file';

  return {
    hero: {
      eyebrow: 'Household profile · Community module',
      headline: `${household.name || 'Unnamed Household'}`,
      description: `This household is located at ${fullAddress} and has ${memberCount} member${memberCount !== 1 ? 's' : ''}.`,
      metrics: [
        { label: 'Household ID', value: household.id?.substring(0, 8) + '...', caption: 'Record identifier' },
        { label: 'Members', value: memberCount.toString(), caption: 'Household members' },
        { label: 'Created', value: household.created_at ? new Date(household.created_at).toLocaleDateString() : '—', caption: 'Record created' },
      ],
    },
  };
};

const resolveHouseholdProfileSummary: ServiceDataSourceHandler = async (request) => {
  const householdId = request.params?.householdId as string;

  if (!householdId) {
    throw new Error('Household ID is required');
  }

  // Fetch household data using shared cached helper
  const household = await fetchHouseholdForProfile(householdId);

  return {
    summary: {
      panels: [
        {
          id: 'household-info',
          title: 'Household information',
          description: 'Basic household details',
          columns: 2,
          items: [
            { label: 'Household name', value: household.name || '—', type: 'text' },
            { label: 'Household ID', value: household.id, type: 'multiline' },
            { label: 'Created', value: household.created_at ? new Date(household.created_at).toLocaleDateString() : '—', type: 'text' },
            { label: 'Updated', value: household.updated_at ? new Date(household.updated_at).toLocaleDateString() : '—', type: 'text' },
          ],
        },
        {
          id: 'address-info',
          title: 'Address information',
          description: 'Household location details',
          columns: 2,
          items: [
            { label: 'Street', value: household.address_street || '—', type: 'text' },
            { label: 'City', value: household.address_city || '—', type: 'text' },
            { label: 'State/Province', value: household.address_state || '—', type: 'text' },
            { label: 'Postal code', value: household.address_postal_code || '—', type: 'text' },
          ],
        },
        {
          id: 'notes-info',
          title: 'Notes',
          description: 'Additional household information',
          columns: 1,
          items: [
            { label: 'Notes', value: household.notes || 'No notes available', type: 'multiline' },
          ],
        },
      ],
    },
  };
};

const resolveHouseholdProfileMembers: ServiceDataSourceHandler = async (request) => {
  const householdId = request.params?.householdId as string;

  if (!householdId) {
    throw new Error('Household ID is required');
  }

  // Fetch household data using shared cached helper
  const household = await fetchHouseholdForProfile(householdId);

  const memberNames = (household.member_names || []) as string[];
  const rows = memberNames.map((name: string, index: number) => ({
    id: `member-${index}`,
    name,
    relationship: '—', // TODO: Get from family_relationships table
  }));

  const columns = [
    {
      field: 'name',
      headerName: 'Member name',
      type: 'text',
    },
    {
      field: 'relationship',
      headerName: 'Relationship',
      type: 'text',
    },
  ];

  return {
    members: {
      rows,
      columns,
    },
  };
};

// Export all handlers
export const adminCommunityHouseholdsHandlers: Record<string, ServiceDataSourceHandler> = {
  'admin-community.households.list.hero': resolveHouseholdsListHero,
  'admin-community.households.list.table': resolveHouseholdsListTable,
  'admin-community.households.manage.hero': resolveHouseholdManageHero,
  'admin-community.households.manage.form': resolveHouseholdManageForm,
  'admin-community.households.manage.save': saveHousehold,
  'admin-community.households.profile.hero': resolveHouseholdProfileHero,
  'admin-community.households.profile.summary': resolveHouseholdProfileSummary,
  'admin-community.households.profile.members': resolveHouseholdProfileMembers,
};
