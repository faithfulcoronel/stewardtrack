import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { FamilyService } from '@/services/FamilyService';
import type { Family } from '@/models/family.model';
import type { FamilyMember, FamilyRole } from '@/models/familyMember.model';

// ==================== LIST PAGE HANDLERS ====================

const resolveFamiliesListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const familyService = container.get<FamilyService>(TYPES.FamilyService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const families = await familyService.getFamiliesWithMemberSummary(tenant.id);
  const totalCount = families.length;

  // Count families with members
  const withMembers = families.filter(f => (f.member_count ?? 0) > 0).length;

  // Count recently created families (last 30 days)
  const recentCount = families.filter(f => {
    const createdAt = f.created_at ? new Date(f.created_at) : null;
    if (!createdAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt > thirtyDaysAgo;
  }).length;

  return {
    hero: {
      eyebrow: 'Family management',
      headline: 'Manage family records and relationships',
      description: 'Track family units, members, and their relationships. Each member can belong to a primary family and additional families.',
      metrics: [
        {
          label: 'Total families',
          value: totalCount.toString(),
          caption: 'Active family records',
        },
        {
          label: 'With members',
          value: withMembers.toString(),
          caption: 'Families with assigned members',
        },
        {
          label: 'New this month',
          value: recentCount.toString(),
          caption: 'Recently created families',
        },
      ],
    },
  };
};

const resolveFamiliesListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const familyService = container.get<FamilyService>(TYPES.FamilyService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const families = await familyService.getFamiliesWithMemberSummary(tenant.id);

  const rows = families.map((family) => ({
    id: family.id,
    name: family.name || 'Unnamed Family',
    formalName: family.formal_name || '—',
    address: [
      family.address_street,
      family.address_city,
      family.address_state,
      family.address_postal_code,
    ].filter(Boolean).join(', ') || '—',
    memberCount: family.member_count || 0,
    headName: family.head?.member?.first_name && family.head?.member?.last_name
      ? `${family.head.member.first_name} ${family.head.member.last_name}`
      : '—',
    createdAt: family.created_at,
  }));

  const columns = [
    {
      field: 'name',
      headerName: 'Family name',
      type: 'link',
      hrefTemplate: '/admin/community/families/{{id}}',
    },
    {
      field: 'formalName',
      headerName: 'Formal name',
      type: 'text',
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
      field: 'headName',
      headerName: 'Head of family',
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
      href: '/admin/community/families/{{id}}',
    },
    {
      id: 'edit',
      label: 'Edit',
      type: 'link',
      href: '/admin/community/families/manage?familyId={{id}}',
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

const resolveFamilyManageHero: ServiceDataSourceHandler = async (request) => {
  const familyId = (request.params?.id || request.params?.familyId) as string | undefined;

  if (!familyId) {
    return {
      hero: {
        eyebrow: 'Add new family · Community module',
        headline: 'Create a new family record',
        description: 'Set up family information and address details.',
        metrics: [
          { label: 'Mode', value: 'Create new record', caption: 'Family ID assigned after save' },
          { label: 'Status', value: 'Active', caption: 'Default status' },
          { label: 'Members', value: '0', caption: 'Add members after creation' },
        ],
      },
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const familyService = container.get<FamilyService>(TYPES.FamilyService);
  const family = await familyService.getFamilyByIdAndTenant(familyId, tenant.id);

  if (!family) {
    throw new Error('Family not found');
  }

  const memberCount = family.member_count || 0;

  return {
    hero: {
      eyebrow: 'Edit family · Community module',
      headline: `Update ${family.name || 'family'} record`,
      description: 'Modify family information and address details.',
      metrics: [
        { label: 'Mode', value: 'Edit existing record', caption: `Family ID ${family.id}` },
        { label: 'Members', value: memberCount.toString(), caption: 'Family members' },
        { label: 'Created', value: family.created_at ? new Date(family.created_at).toLocaleDateString() : '—', caption: 'Record created' },
      ],
    },
  };
};

const resolveFamilyManageForm: ServiceDataSourceHandler = async (request) => {
  const familyId = (request.params?.id || request.params?.familyId) as string | undefined;
  const isCreate = !familyId;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let family: Partial<Family> = {};

  if (familyId) {
    const familyService = container.get<FamilyService>(TYPES.FamilyService);
    const existingFamily = await familyService.getFamilyByIdAndTenant(familyId, tenant.id);
    if (existingFamily) {
      family = existingFamily;
    }
  }

  return {
    form: {
      title: isCreate ? 'Family information' : 'Update family information',
      description: 'Enter family details and address information.',
      mode: isCreate ? 'create' : 'edit',
      submitLabel: isCreate ? 'Create family' : 'Update family',
      contextParams: {
        familyId: family.id,
        tenantId: tenant?.id,
      },
      initialValues: {
        ...(familyId ? { familyId: family.id } : {}),
        name: family.name || '',
        formalName: family.formal_name || '',
        addressStreet: family.address_street || '',
        addressStreet2: family.address_street2 || '',
        addressCity: family.address_city || '',
        addressState: family.address_state || '',
        addressPostalCode: family.address_postal_code || '',
        addressCountry: family.address_country || 'Philippines',
        notes: family.notes || '',
      },
      fields: [
        ...(familyId ? [{
          name: 'familyId',
          type: 'hidden' as const,
        }] : []),
        {
          name: 'name',
          label: 'Family name',
          type: 'text',
          colSpan: 'half',
          placeholder: 'Smith Family',
          helperText: 'Primary family identifier (e.g., "Smith Family")',
          required: true,
        },
        {
          name: 'formalName',
          label: 'Formal name',
          type: 'text',
          colSpan: 'half',
          placeholder: 'The Smith Family',
          helperText: 'Formal name for correspondence',
        },
        {
          name: 'addressStreet',
          label: 'Street address',
          type: 'text',
          colSpan: 'full',
          placeholder: '123 Main Street',
          helperText: 'Primary street address',
        },
        {
          name: 'addressStreet2',
          label: 'Street address 2',
          type: 'text',
          colSpan: 'full',
          placeholder: 'Apt 4B',
          helperText: 'Apartment, suite, unit, etc.',
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
          name: 'addressCountry',
          label: 'Country',
          type: 'text',
          colSpan: 'full',
          placeholder: 'USA',
          helperText: 'Country',
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Additional family information...',
          helperText: 'Internal notes about this family',
          rows: 4,
        },
      ],
    },
  };
};

const saveFamily: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;

  console.log('[saveFamily] Full request object:', JSON.stringify({
    params: params,
    config: request.config,
    id: request.id,
  }, null, 2));

  const familyId = (params.familyId || params.id || request.config?.familyId) as string | undefined;

  console.log('[saveFamily] Attempting to save family. ID:', familyId, 'Mode:', familyId ? 'update' : 'create');

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    const familyData: Partial<Family> = {
      tenant_id: tenant.id,
      name: params.name as string,
      formal_name: params.formalName ? (params.formalName as string) : null,
      address_street: params.addressStreet ? (params.addressStreet as string) : null,
      address_street2: params.addressStreet2 ? (params.addressStreet2 as string) : null,
      address_city: params.addressCity ? (params.addressCity as string) : null,
      address_state: params.addressState ? (params.addressState as string) : null,
      address_postal_code: params.addressPostalCode ? (params.addressPostalCode as string) : null,
      address_country: params.addressCountry ? (params.addressCountry as string) : null,
      notes: params.notes ? (params.notes as string) : null,
    };

    console.log('[saveFamily] Family data to save:', JSON.stringify(familyData, null, 2));

    let family: Family;

    if (familyId) {
      console.log('[saveFamily] Updating family:', familyId);
      family = await familyService.updateFamily(familyId, familyData);
    } else {
      console.log('[saveFamily] Creating new family');
      family = await familyService.createFamily(familyData);
    }

    console.log('[saveFamily] Family saved successfully:', family.id, 'Name:', family.name);

    return {
      success: true,
      message: familyId ? 'Family updated successfully' : 'Family created successfully',
      familyId: family.id,
    };
  } catch (error: unknown) {
    console.error('[saveFamily] Failed to save family:', error);

    const errorMessage = error instanceof Error ? error.message.trim() : '';
    let userMessage = 'Something went wrong while saving the family. Please try again.';

    if (errorMessage.includes('null value in column') && errorMessage.includes('violates not-null constraint')) {
      const columnMatch = errorMessage.match(/column "([^"]+)"/);
      const columnName = columnMatch ? columnMatch[1] : 'a required field';
      userMessage = `The ${columnName} field is required but was not provided. Please ensure all required fields are filled in.`;
    } else if (errorMessage.includes('duplicate key value violates unique constraint')) {
      userMessage = 'A family with this information already exists. Please check for duplicates.';
    } else if (errorMessage.includes('violates foreign key constraint')) {
      userMessage = 'The selected option is no longer valid. Please refresh the page and try again.';
    } else if (errorMessage && !errorMessage.includes('SupabaseClient') && !errorMessage.includes('undefined') && errorMessage.length < 200) {
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
 * Request-scoped cache for family data to prevent redundant fetches
 */
const familyProfileCache = new Map<string, Promise<Family>>();

/**
 * Shared helper to fetch family data once per request
 */
const fetchFamilyForProfile = async (familyId: string): Promise<Family> => {
  const cached = familyProfileCache.get(familyId);
  if (cached) {
    console.log('[fetchFamilyForProfile] Using cached family data for ID:', familyId);
    return cached;
  }

  console.log('[fetchFamilyForProfile] Fetching family data for ID:', familyId);

  const fetchPromise = (async () => {
    try {
      const tenantService = container.get<TenantService>(TYPES.TenantService);
      const tenant = await tenantService.getCurrentTenant();
      if (!tenant) {
        throw new Error('No tenant context available');
      }

      console.log('[fetchFamilyForProfile] Tenant context resolved:', tenant.id);

      const familyService = container.get<FamilyService>(TYPES.FamilyService);
      const family = await familyService.getFamilyWithMembers(familyId, tenant.id);

      console.log('[fetchFamilyForProfile] Family fetched:', family?.id);

      if (!family) {
        throw new Error('Family not found');
      }

      setTimeout(() => {
        familyProfileCache.delete(familyId);
        console.log('[fetchFamilyForProfile] Cache cleaned for family:', familyId);
      }, 5000);

      return family;
    } catch (error) {
      familyProfileCache.delete(familyId);
      throw error;
    }
  })();

  familyProfileCache.set(familyId, fetchPromise);
  return fetchPromise;
};

const resolveFamilyProfileHero: ServiceDataSourceHandler = async (request) => {
  const familyId = request.params?.familyId as string;

  if (!familyId) {
    throw new Error('Family ID is required');
  }

  const family = await fetchFamilyForProfile(familyId);

  const memberCount = family.members?.length || family.member_count || 0;
  const fullAddress = [
    family.address_street,
    family.address_city,
    family.address_state,
    family.address_postal_code,
  ].filter(Boolean).join(', ') || 'No address on file';

  return {
    hero: {
      eyebrow: 'Family profile · Community module',
      headline: `${family.name || 'Unnamed Family'}`,
      description: `This family is located at ${fullAddress} and has ${memberCount} member${memberCount !== 1 ? 's' : ''}.`,
      metrics: [
        { label: 'Family ID', value: family.id?.substring(0, 8) + '...', caption: 'Record identifier' },
        { label: 'Members', value: memberCount.toString(), caption: 'Family members' },
        { label: 'Created', value: family.created_at ? new Date(family.created_at).toLocaleDateString() : '—', caption: 'Record created' },
      ],
    },
  };
};

const resolveFamilyProfileSummary: ServiceDataSourceHandler = async (request) => {
  const familyId = request.params?.familyId as string;

  if (!familyId) {
    throw new Error('Family ID is required');
  }

  const family = await fetchFamilyForProfile(familyId);

  return {
    summary: {
      panels: [
        {
          id: 'family-info',
          title: 'Family information',
          description: 'Basic family details',
          columns: 2,
          items: [
            { label: 'Family name', value: family.name || '—', type: 'text' },
            { label: 'Formal name', value: family.formal_name || '—', type: 'text' },
            { label: 'Family ID', value: family.id, type: 'multiline' },
            { label: 'Created', value: family.created_at ? new Date(family.created_at).toLocaleDateString() : '—', type: 'text' },
            { label: 'Updated', value: family.updated_at ? new Date(family.updated_at).toLocaleDateString() : '—', type: 'text' },
          ],
        },
        {
          id: 'address-info',
          title: 'Address information',
          description: 'Family location details',
          columns: 2,
          items: [
            { label: 'Street', value: family.address_street || '—', type: 'text' },
            { label: 'Street 2', value: family.address_street2 || '—', type: 'text' },
            { label: 'City', value: family.address_city || '—', type: 'text' },
            { label: 'State/Province', value: family.address_state || '—', type: 'text' },
            { label: 'Postal code', value: family.address_postal_code || '—', type: 'text' },
            { label: 'Country', value: family.address_country || '—', type: 'text' },
          ],
        },
        {
          id: 'notes-info',
          title: 'Notes',
          description: 'Additional family information',
          columns: 1,
          items: [
            { label: 'Notes', value: family.notes || 'No notes available', type: 'multiline' },
          ],
        },
      ],
    },
  };
};

function formatRoleLabel(role: FamilyRole): string {
  switch (role) {
    case 'head':
      return 'Head of Family';
    case 'spouse':
      return 'Spouse';
    case 'child':
      return 'Child';
    case 'dependent':
      return 'Dependent';
    case 'other':
    default:
      return 'Other';
  }
}

const resolveFamilyProfileMembers: ServiceDataSourceHandler = async (request) => {
  const familyId = request.params?.familyId as string;

  if (!familyId) {
    throw new Error('Family ID is required');
  }

  const family = await fetchFamilyForProfile(familyId);

  const members = (family.members || []) as FamilyMember[];
  const rows = members.map((fm: FamilyMember, index: number) => ({
    id: fm.id || `member-${index}`,
    memberId: fm.member_id,
    name: fm.member
      ? `${fm.member.first_name || ''} ${fm.member.last_name || ''}`.trim() || 'Unknown'
      : 'Unknown',
    email: fm.member?.email || '—',
    phone: fm.member?.contact_number || '—',
    role: formatRoleLabel(fm.role),
    isPrimary: fm.is_primary ? 'Yes' : 'No',
    joinedAt: fm.joined_at || '—',
  }));

  const columns = [
    {
      field: 'name',
      headerName: 'Member name',
      type: 'link',
      hrefTemplate: '/admin/members/{{memberId}}',
    },
    {
      field: 'email',
      headerName: 'Email',
      type: 'text',
    },
    {
      field: 'phone',
      headerName: 'Phone',
      type: 'text',
    },
    {
      field: 'role',
      headerName: 'Role',
      type: 'text',
    },
    {
      field: 'isPrimary',
      headerName: 'Primary family',
      type: 'text',
    },
  ];

  const actions = [
    {
      id: 'view-member',
      label: 'View member',
      type: 'link',
      href: '/admin/members/{{memberId}}',
    },
    {
      id: 'remove',
      label: 'Remove from family',
      type: 'action',
      actionId: 'admin-community.families.removeMember',
      confirmMessage: 'Are you sure you want to remove this member from the family?',
    },
  ];

  return {
    members: {
      rows,
      columns,
      actions,
    },
  };
};

// ==================== QUICK CREATE HANDLER ====================

/**
 * Quick create action for creating a new family from the member manage page
 * Takes just a family name and creates the family with minimal data
 */
const quickCreateFamily: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const familyName = (params.name as string)?.trim();

  console.log('[quickCreateFamily] Creating family with name:', familyName);

  if (!familyName) {
    return {
      success: false,
      message: 'Family name is required',
      family: null,
    };
  }

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    // Check for duplicate family name within tenant
    const existingFamilies = await familyService.searchFamilies(tenant.id, familyName);
    const isDuplicate = existingFamilies.some(
      f => f.name?.toLowerCase() === familyName.toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        message: 'A family with this name already exists',
        family: null,
      };
    }

    // Create the family with minimal data
    const newFamily = await familyService.createFamily({
      tenant_id: tenant.id,
      name: familyName,
    });

    console.log('[quickCreateFamily] Family created successfully:', newFamily.id);

    return {
      success: true,
      message: `Family "${familyName}" created successfully`,
      family: {
        id: newFamily.id!,
        name: newFamily.name || familyName,
        address_street: newFamily.address_street ?? null,
        address_city: newFamily.address_city ?? null,
        address_state: newFamily.address_state ?? null,
        address_postal_code: newFamily.address_postal_code ?? null,
        member_count: 0,
      },
    };
  } catch (error: unknown) {
    console.error('[quickCreateFamily] Failed to create family:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to create family';
    return {
      success: false,
      message: errorMessage,
      family: null,
    };
  }
};

// Export all handlers
export const adminCommunityFamiliesHandlers: Record<string, ServiceDataSourceHandler> = {
  'admin-community.families.list.hero': resolveFamiliesListHero,
  'admin-community.families.list.table': resolveFamiliesListTable,
  'admin-community.families.manage.hero': resolveFamilyManageHero,
  'admin-community.families.manage.form': resolveFamilyManageForm,
  'admin-community.families.manage.save': saveFamily,
  'admin-community.families.profile.hero': resolveFamilyProfileHero,
  'admin-community.families.profile.summary': resolveFamilyProfileSummary,
  'admin-community.families.profile.members': resolveFamilyProfileMembers,
  'admin-community.families.quickCreate': quickCreateFamily,
};
