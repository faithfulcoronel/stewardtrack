import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { AccountService } from '@/services/AccountService';
import type { MemberService } from '@/services/MemberService';
import type { Account } from '@/models/account.model';
import type { Member } from '@/models/member.model';

// ==================== LIST PAGE HANDLERS ====================

const resolveAccountsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const accountService = container.get<AccountService>(TYPES.AccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const accounts = await accountService.findAll();
  const totalCount = accounts.data?.length || 0;
  const activeCount = accounts.data?.filter(a => a.is_active).length || 0;
  const organizationCount = accounts.data?.filter(a => a.account_type === 'organization').length || 0;
  const personCount = accounts.data?.filter(a => a.account_type === 'person').length || 0;

  return {
    hero: {
      eyebrow: 'Account management',
      headline: 'Manage accounts and financial entities',
      description: 'Track organizations and individuals with financial relationships to your church.',
      metrics: [
        {
          label: 'Total accounts',
          value: totalCount.toString(),
          caption: 'Active account records',
        },
        {
          label: 'Organizations',
          value: organizationCount.toString(),
          caption: 'Business and nonprofit accounts',
        },
        {
          label: 'Individuals',
          value: personCount.toString(),
          caption: 'Person accounts',
        },
      ],
    },
  };
};

const resolveAccountsListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const accountService = container.get<AccountService>(TYPES.AccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const accounts = await accountService.findAll();

  const rows = (accounts.data || []).map((account) => ({
    id: account.id,
    name: account.name || 'Unnamed Account',
    accountNumber: account.account_number || '—',
    accountType: account.account_type === 'organization' ? 'Organization' : 'Person',
    accountTypeKey: account.account_type,
    email: account.email || '—',
    phone: account.phone || '—',
    isActive: account.is_active,
    status: account.is_active ? 'Active' : 'Inactive',
    statusVariant: account.is_active ? 'success' : 'neutral',
    memberName: account.member
      ? `${account.member.first_name || ''} ${account.member.last_name || ''}`.trim()
      : '—',
    createdAt: account.created_at,
  }));

  const columns = [
    {
      field: 'name',
      headerName: 'Account name',
      type: 'link',
      hrefTemplate: '/admin/community/accounts/{{id}}',
    },
    {
      field: 'accountNumber',
      headerName: 'Account #',
      type: 'text',
    },
    {
      field: 'accountType',
      headerName: 'Type',
      type: 'badge',
      badgeField: 'accountTypeKey',
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
      field: 'status',
      headerName: 'Status',
      type: 'badge',
      badgeField: 'statusVariant',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'view-record',
          label: 'View',
          intent: 'view',
          urlTemplate: '/admin/community/accounts/{{id}}',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/community/accounts/manage?accountId={{id}}',
          variant: 'secondary',
        },
        {
          id: 'delete-record',
          label: 'Delete',
          intent: 'delete',
          handler: 'admin-community.accounts.delete',
          confirmTitle: 'Delete Account',
          confirmDescription: 'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
          confirmLabel: 'Delete',
          cancelLabel: 'Cancel',
          successMessage: '{{name}} was deleted.',
          variant: 'destructive',
        },
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search by name, account number, or email...',
    },
    {
      id: 'accountType',
      type: 'select',
      placeholder: 'Account type',
      options: [
        { label: 'All types', value: 'all' },
        { label: 'Organization', value: 'organization' },
        { label: 'Person', value: 'person' },
      ],
    },
    {
      id: 'status',
      type: 'select',
      placeholder: 'Status',
      options: [
        { label: 'All statuses', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];

  return {
    table: {
      rows,
      columns,
      filters,
    },
  };
};

// ==================== MANAGE PAGE HANDLERS ====================

const resolveAccountManageHero: ServiceDataSourceHandler = async (request) => {
  const accountId = (request.params?.id || request.params?.accountId) as string | undefined;

  if (!accountId) {
    return {
      hero: {
        eyebrow: 'Add new account · Community module',
        headline: 'Create a new account record',
        description: 'Set up account information for an organization or individual.',
        metrics: [
          { label: 'Mode', value: 'Create new record', caption: 'Account number assigned after save' },
          { label: 'Status', value: 'Active', caption: 'Default status' },
          { label: 'Type', value: 'Not set', caption: 'Select account type' },
        ],
      },
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const accountService = container.get<AccountService>(TYPES.AccountService);
  const account = await accountService.findById(accountId);

  if (!account) {
    throw new Error('Account not found');
  }

  return {
    hero: {
      eyebrow: 'Edit account · Community module',
      headline: `Update ${account.name || 'account'} record`,
      description: 'Modify account information and contact details.',
      metrics: [
        { label: 'Mode', value: 'Edit existing record', caption: `Account ${account.account_number}` },
        { label: 'Type', value: account.account_type === 'organization' ? 'Organization' : 'Person', caption: 'Account type' },
        { label: 'Created', value: account.created_at ? new Date(account.created_at).toLocaleDateString() : '—', caption: 'Record created' },
      ],
    },
  };
};

const resolveAccountManageForm: ServiceDataSourceHandler = async (request) => {
  const accountId = (request.params?.id || request.params?.accountId) as string | undefined;
  const isCreate = !accountId;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let account: Partial<Account> = {};

  if (accountId) {
    const accountService = container.get<AccountService>(TYPES.AccountService);
    const existingAccount = await accountService.findById(accountId);
    if (existingAccount) {
      account = existingAccount;
    }
  }

  return {
    form: {
      title: isCreate ? 'Account information' : 'Update account information',
      description: 'Enter account details and contact information.',
      mode: isCreate ? 'create' : 'edit',
      submitLabel: isCreate ? 'Create account' : 'Update account',
      contextParams: {
        accountId: account.id,
        tenantId: tenant?.id,
      },
      initialValues: {
        ...(accountId ? { accountId: account.id } : {}),
        name: account.name || '',
        accountType: account.account_type || 'organization',
        accountNumber: account.account_number || '',
        description: account.description || '',
        email: account.email || '',
        phone: account.phone || '',
        address: account.address || '',
        website: account.website || '',
        taxId: account.tax_id || '',
        isActive: account.is_active ?? true,
        notes: account.notes || '',
      },
      fields: [
        ...(accountId ? [{
          name: 'accountId',
          type: 'hidden' as const,
        }] : []),
        {
          name: 'name',
          label: 'Account name',
          type: 'text',
          colSpan: 'half',
          placeholder: 'Enter account name',
          helperText: 'Primary name for this account',
          required: true,
        },
        {
          name: 'accountType',
          label: 'Account type',
          type: 'select',
          colSpan: 'half',
          helperText: isCreate
            ? 'Person accounts are created via member sync'
            : 'Account type cannot be changed',
          required: true,
          disabled: !isCreate,
          options: isCreate
            ? [{ value: 'organization', label: 'Organization' }]
            : [
                { value: 'organization', label: 'Organization' },
                { value: 'person', label: 'Person' },
              ],
        },
        {
          name: 'accountNumber',
          label: 'Account number',
          type: 'text',
          colSpan: 'half',
          placeholder: 'Auto-generated if empty',
          helperText: 'Leave empty to auto-generate',
        },
        {
          name: 'isActive',
          label: 'Account status',
          type: 'toggle',
          colSpan: 'half',
          helperText: 'Active accounts can be used in transactions',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Brief description of this account...',
          helperText: 'Optional description for internal reference',
          rows: 2,
        },
        {
          name: 'email',
          label: 'Email address',
          type: 'email',
          colSpan: 'half',
          placeholder: 'email@example.com',
          helperText: 'Primary contact email',
        },
        {
          name: 'phone',
          label: 'Phone number',
          type: 'tel',
          colSpan: 'half',
          placeholder: '+1 (555) 123-4567',
          helperText: 'Primary contact phone',
        },
        {
          name: 'address',
          label: 'Address',
          type: 'textarea',
          colSpan: 'full',
          placeholder: '123 Main Street\nCity, State 12345',
          helperText: 'Full mailing address',
          rows: 3,
        },
        {
          name: 'website',
          label: 'Website',
          type: 'url',
          colSpan: 'half',
          placeholder: 'https://example.com',
          helperText: 'Organization website URL',
        },
        {
          name: 'taxId',
          label: 'Tax ID (SSN/EIN)',
          type: 'text',
          colSpan: 'half',
          placeholder: 'XX-XXXXXXX',
          helperText: 'For tax reporting purposes (encrypted)',
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Additional notes about this account...',
          helperText: 'Internal notes (encrypted)',
          rows: 4,
        },
      ],
    },
  };
};

const saveAccount: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const values = (params.values ?? params) as Record<string, unknown>;

  console.log('[saveAccount] Full request object:', JSON.stringify({
    params: params,
    values: values,
    config: request.config,
    id: request.id,
  }, null, 2));

  const accountId = (values.accountId ?? params.accountId ?? params.id ?? request.config?.accountId) as string | undefined;

  console.log('[saveAccount] Attempting to save account. ID:', accountId, 'Mode:', accountId ? 'update' : 'create');

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const accountService = container.get<AccountService>(TYPES.AccountService);

    // Generate account number if not provided
    let accountNumber = (values.accountNumber as string) || '';
    if (!accountNumber.trim()) {
      const generateResult = await accountService.generateAccountNumber({
        pageId: 'accounts-manage',
        changedField: 'name',
        model: {
          name: values.name as string,
          account_type: values.accountType as string,
        },
      });
      accountNumber = generateResult.updatedFields.account_number || '';
    }

    const accountData: Partial<Account> = {
      tenant_id: tenant.id,
      name: values.name as string,
      account_type: values.accountType as 'organization' | 'person',
      account_number: accountNumber,
      description: values.description ? (values.description as string) : null,
      email: values.email ? (values.email as string) : null,
      phone: values.phone ? (values.phone as string) : null,
      address: values.address ? (values.address as string) : null,
      website: values.website ? (values.website as string) : null,
      tax_id: values.taxId ? (values.taxId as string) : null,
      is_active: values.isActive === true || values.isActive === 'true',
      notes: values.notes ? (values.notes as string) : null,
    };

    console.log('[saveAccount] Account data to save:', JSON.stringify(accountData, null, 2));

    let account: Account;

    if (accountId) {
      console.log('[saveAccount] Updating account:', accountId);
      account = await accountService.update(accountId, accountData);
    } else {
      console.log('[saveAccount] Creating new account');
      account = await accountService.create(accountData);
    }

    console.log('[saveAccount] Account saved successfully:', account.id, 'Name:', account.name);

    return {
      success: true,
      message: accountId ? 'Account updated successfully' : 'Account created successfully',
      accountId: account.id,
    };
  } catch (error: any) {
    console.error('[saveAccount] Failed to save account:', error);

    const errorMessage = error?.message?.trim() || '';
    let userMessage = 'Something went wrong while saving the account. Please try again.';

    if (errorMessage.includes('null value in column') && errorMessage.includes('violates not-null constraint')) {
      const columnMatch = errorMessage.match(/column "([^"]+)"/);
      const columnName = columnMatch ? columnMatch[1] : 'a required field';
      userMessage = `The ${columnName} field is required but was not provided. Please ensure all required fields are filled in.`;
    } else if (errorMessage.includes('duplicate key value violates unique constraint')) {
      userMessage = 'An account with this information already exists. Please check for duplicates.';
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

const accountProfileCache = new Map<string, Promise<Account>>();

const fetchAccountForProfile = async (accountId: string): Promise<Account> => {
  const cached = accountProfileCache.get(accountId);
  if (cached) {
    console.log('[fetchAccountForProfile] Using cached account data for ID:', accountId);
    return cached;
  }

  console.log('[fetchAccountForProfile] Fetching account data for ID:', accountId);

  const fetchPromise = (async () => {
    try {
      const tenantService = container.get<TenantService>(TYPES.TenantService);
      const tenant = await tenantService.getCurrentTenant();
      if (!tenant) {
        throw new Error('No tenant context available');
      }

      console.log('[fetchAccountForProfile] Tenant context resolved:', tenant.id);

      const accountService = container.get<AccountService>(TYPES.AccountService);
      const account = await accountService.findById(accountId);

      console.log('[fetchAccountForProfile] Account fetched:', account?.id);

      if (!account) {
        throw new Error('Account not found');
      }

      setTimeout(() => {
        accountProfileCache.delete(accountId);
        console.log('[fetchAccountForProfile] Cache cleaned for account:', accountId);
      }, 5000);

      return account;
    } catch (error) {
      accountProfileCache.delete(accountId);
      throw error;
    }
  })();

  accountProfileCache.set(accountId, fetchPromise);
  return fetchPromise;
};

const resolveAccountProfileHero: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.accountId as string;

  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const account = await fetchAccountForProfile(accountId);

  const accountTypeLabel = account.account_type === 'organization' ? 'Organization' : 'Individual';

  return {
    hero: {
      eyebrow: 'Account profile · Community module',
      headline: `${account.name || 'Unnamed Account'}`,
      description: `This ${accountTypeLabel.toLowerCase()} account (${account.account_number}) is ${account.is_active ? 'currently active' : 'inactive'}.`,
      metrics: [
        { label: 'Account #', value: account.account_number || '—', caption: 'Account identifier' },
        { label: 'Type', value: accountTypeLabel, caption: 'Account type' },
        { label: 'Status', value: account.is_active ? 'Active' : 'Inactive', caption: 'Current status' },
      ],
    },
  };
};

const resolveAccountProfileSummary: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.accountId as string;

  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const account = await fetchAccountForProfile(accountId);

  return {
    summary: {
      panels: [
        {
          id: 'account-info',
          title: 'Account information',
          description: 'Basic account details',
          columns: 2,
          items: [
            { label: 'Account name', value: account.name || '—', type: 'text' },
            { label: 'Account number', value: account.account_number || '—', type: 'text' },
            { label: 'Account type', value: account.account_type === 'organization' ? 'Organization' : 'Person', type: 'text' },
            { label: 'Status', value: account.is_active ? 'Active' : 'Inactive', type: 'badge', badgeVariant: account.is_active ? 'success' : 'neutral' },
            { label: 'Description', value: account.description || '—', type: 'multiline' },
          ],
        },
        {
          id: 'contact-info',
          title: 'Contact information',
          description: 'Account contact details (encrypted)',
          columns: 2,
          items: [
            { label: 'Email', value: account.email || '—', type: 'text' },
            { label: 'Phone', value: account.phone || '—', type: 'text' },
            { label: 'Website', value: account.website || '—', type: 'text' },
            { label: 'Address', value: account.address || '—', type: 'multiline' },
          ],
        },
        {
          id: 'financial-info',
          title: 'Financial information',
          description: 'Tax and financial details (encrypted)',
          columns: 2,
          items: [
            { label: 'Tax ID (SSN/EIN)', value: account.tax_id ? '••••••' + account.tax_id.slice(-4) : '—', type: 'text' },
            { label: 'Linked member', value: account.member
              ? `${account.member.first_name || ''} ${account.member.last_name || ''}`.trim()
              : 'Not linked', type: 'text' },
          ],
        },
        {
          id: 'notes-info',
          title: 'Notes',
          description: 'Additional account information (encrypted)',
          columns: 1,
          items: [
            { label: 'Notes', value: account.notes || 'No notes available', type: 'multiline' },
          ],
        },
        {
          id: 'audit-info',
          title: 'Record information',
          description: 'Audit trail',
          columns: 2,
          items: [
            { label: 'Created', value: account.created_at ? new Date(account.created_at).toLocaleDateString() : '—', type: 'text' },
            { label: 'Last updated', value: account.updated_at ? new Date(account.updated_at).toLocaleDateString() : '—', type: 'text' },
          ],
        },
      ],
    },
  };
};

// ==================== DASHBOARD PAGE HANDLERS ====================

/**
 * Lightweight account stats for dashboard - uses minimal fields.
 * Returns simplified objects to avoid serialization issues with large datasets.
 */
async function fetchAccountStatsForDashboard(_tenantId: string): Promise<{
  total: number;
  active: number;
  inactive: number;
  organizations: number;
  persons: number;
  linkedToMembers: number;
  recentCount: number;
}> {
  console.log('[fetchAccountStatsForDashboard] Fetching account stats');
  const accountService = container.get<AccountService>(TYPES.AccountService);
  const result = await accountService.findAll();
  const accounts = result.data || [];

  // Calculate stats without holding large objects
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let active = 0, organizations = 0, persons = 0, linkedToMembers = 0, recentCount = 0;

  for (const a of accounts) {
    if (a.is_active) active++;
    if (a.account_type === 'organization') organizations++;
    if (a.account_type === 'person') persons++;
    if (a.member_id) linkedToMembers++;
    if (a.created_at && new Date(a.created_at) >= thirtyDaysAgo) recentCount++;
  }

  const stats = {
    total: accounts.length,
    active,
    inactive: accounts.length - active,
    organizations,
    persons,
    linkedToMembers,
    recentCount,
  };

  console.log('[fetchAccountStatsForDashboard] Stats:', stats);
  return stats;
}

/**
 * Fetches recent accounts for timeline (limited to 10).
 */
async function fetchRecentAccountsForTimeline(_tenantId: string): Promise<Array<{
  id: string;
  name: string;
  account_number: string;
  account_type: string;
  is_active: boolean;
  created_at: string;
}>> {
  console.log('[fetchRecentAccountsForTimeline] Fetching recent accounts');
  const accountService = container.get<AccountService>(TYPES.AccountService);
  const result = await accountService.findAll();
  const accounts = result.data || [];

  // Sort by created_at and take only the 10 most recent
  const recent = accounts
    .filter(a => a.created_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, 10)
    .map(a => ({
      id: a.id,
      name: a.name || 'Unnamed Account',
      account_number: a.account_number || '',
      account_type: a.account_type,
      is_active: a.is_active,
      created_at: a.created_at!,
    }));

  console.log('[fetchRecentAccountsForTimeline] Returning', recent.length, 'recent accounts');
  return recent;
}

/**
 * Helper to format relative time
 */
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

/**
 * Dashboard Hero Handler
 */
const resolveAccountsDashboardHero: ServiceDataSourceHandler = async (_request) => {
  console.log('[resolveAccountsDashboardHero] START');
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Use lightweight stats to avoid serialization issues
  const stats = await fetchAccountStatsForDashboard(tenant.id);
  console.log('[resolveAccountsDashboardHero] Got stats');
  const { total: totalCount, active: activeCount, organizations: organizationCount, persons: personCount, recentCount } = stats;

  return {
    eyebrow: 'Account intelligence dashboard',
    headline: 'Manage financial relationships with confidence',
    description: 'Track organizations and individuals, monitor account health, and maintain accurate financial records for your church.',
    highlights: [
      'Maintain organization and individual accounts with encrypted contact information.',
      'Track account status and link accounts to member records for integrated reporting.',
      'Generate account numbers automatically and manage tax ID information securely.',
    ],
    metrics: [
      {
        label: 'Total accounts',
        value: totalCount.toLocaleString(),
        caption: `${activeCount} active, ${totalCount - activeCount} inactive`,
      },
      {
        label: 'New this month',
        value: recentCount.toLocaleString(),
        caption: 'Accounts added in last 30 days',
      },
      {
        label: 'Organizations',
        value: organizationCount.toLocaleString(),
        caption: `${personCount} individual accounts`,
      },
    ],
  };
};

/**
 * Dashboard KPIs Handler
 */
const resolveAccountsDashboardKpis: ServiceDataSourceHandler = async (_request) => {
  console.log('[resolveAccountsDashboardKpis] START');
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Use lightweight stats to avoid serialization issues
  const stats = await fetchAccountStatsForDashboard(tenant.id);
  console.log('[resolveAccountsDashboardKpis] Got stats');
  const { total: totalCount, active: activeCount, organizations: organizationCount, persons: personCount, linkedToMembers: linkedToMemberCount, recentCount } = stats;

  return {
    items: [
      {
        id: 'kpi-total-accounts',
        label: 'Total accounts',
        value: totalCount.toString(),
        change: recentCount > 0 ? `+${recentCount}` : '0',
        changeLabel: 'this month',
        trend: recentCount > 0 ? 'up' : 'flat',
        tone: recentCount > 0 ? 'positive' : 'neutral',
        description: `${activeCount} active accounts in the system.`,
      },
      {
        id: 'kpi-organizations',
        label: 'Organizations',
        value: organizationCount.toString(),
        change: '',
        changeLabel: 'business accounts',
        trend: 'flat',
        tone: 'informative',
        description: 'Companies, nonprofits, and vendors.',
      },
      {
        id: 'kpi-individuals',
        label: 'Individuals',
        value: personCount.toString(),
        change: '',
        changeLabel: 'person accounts',
        trend: 'flat',
        tone: 'informative',
        description: 'Individual financial relationships.',
      },
      {
        id: 'kpi-linked-members',
        label: 'Linked to members',
        value: linkedToMemberCount.toString(),
        change: '',
        changeLabel: 'connected',
        trend: 'flat',
        tone: linkedToMemberCount > 0 ? 'positive' : 'neutral',
        description: `${totalCount - linkedToMemberCount} accounts not linked to members.`,
      },
    ],
  };
};

/**
 * Dashboard Quick Links Handler
 */
const resolveAccountsDashboardQuickLinks: ServiceDataSourceHandler = async (_request) => {
  console.log('[resolveAccountsDashboardQuickLinks] START');
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Use lightweight stats to avoid serialization issues
  const stats = await fetchAccountStatsForDashboard(tenant.id);
  console.log('[resolveAccountsDashboardQuickLinks] Got stats');
  const { total, organizations: organizationCount, persons: personCount } = stats;

  return {
    items: [
      {
        id: 'link-all-accounts',
        title: 'Account directory',
        description: 'View and manage all organization and individual accounts.',
        href: '/admin/community/accounts/list',
        badge: 'Directory',
        stat: `${total} total accounts`,
      },
      {
        id: 'link-organizations',
        title: 'Organizations',
        description: 'Manage business, nonprofit, and vendor accounts.',
        href: '/admin/community/accounts/list?accountType=organization',
        badge: 'Organizations',
        stat: `${organizationCount} organization accounts`,
      },
      {
        id: 'link-individuals',
        title: 'Individuals',
        description: 'Manage individual person accounts.',
        href: '/admin/community/accounts/list?accountType=person',
        badge: 'Individuals',
        stat: `${personCount} person accounts`,
      },
      {
        id: 'link-new-account',
        title: 'Add new account',
        description: 'Create a new organization or individual account record.',
        href: '/admin/community/accounts/manage',
        badge: 'Quick Action',
        stat: 'Create account',
      },
    ],
    actions: [
      {
        id: 'action-view-all',
        kind: 'link',
        config: {
          label: 'View all accounts',
          url: '/admin/community/accounts/list',
          variant: 'secondary',
        },
      },
    ],
  };
};

/**
 * Dashboard Account Type Breakdown Handler
 */
const resolveAccountsDashboardBreakdown: ServiceDataSourceHandler = async (_request) => {
  console.log('[resolveAccountsDashboardBreakdown] START');
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Use lightweight stats to avoid serialization issues
  const stats = await fetchAccountStatsForDashboard(tenant.id);
  console.log('[resolveAccountsDashboardBreakdown] Got stats');
  const { total: totalCount, active: activeCount, inactive: inactiveCount, organizations: organizationCount, persons: personCount } = stats;

  return {
    breakdown: {
      title: 'Account composition',
      description: 'Distribution of accounts by type and status.',
      items: [
        {
          label: 'Organizations',
          value: organizationCount,
          percentage: totalCount > 0 ? Math.round((organizationCount / totalCount) * 100) : 0,
          color: 'blue',
        },
        {
          label: 'Individuals',
          value: personCount,
          percentage: totalCount > 0 ? Math.round((personCount / totalCount) * 100) : 0,
          color: 'green',
        },
      ],
      statusItems: [
        {
          label: 'Active',
          value: activeCount,
          percentage: totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0,
          color: 'emerald',
        },
        {
          label: 'Inactive',
          value: inactiveCount,
          percentage: totalCount > 0 ? Math.round((inactiveCount / totalCount) * 100) : 0,
          color: 'gray',
        },
      ],
    },
  };
};

/**
 * Dashboard Recent Activity Timeline Handler
 */
const resolveAccountsDashboardTimeline: ServiceDataSourceHandler = async (_request) => {
  console.log('[resolveAccountsDashboardTimeline] START');
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Use lightweight function that only returns recent accounts
  const recentAccounts = await fetchRecentAccountsForTimeline(tenant.id);
  console.log('[resolveAccountsDashboardTimeline] Got recent accounts:', recentAccounts.length);

  if (recentAccounts.length === 0) {
    return {
      items: [
        {
          id: 'empty-state',
          title: 'No recent activity',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timeAgo: 'Today',
          description: 'Account creation and updates will appear here as they happen.',
          category: 'Info',
          status: 'new',
          icon: '📋',
        },
      ],
    };
  }

  const items = recentAccounts.map((account, index) => {
    const createdDate = new Date(account.created_at!);
    const accountTypeLabel = account.account_type === 'organization' ? 'Organization' : 'Individual';

    return {
      id: account.id || `account-${index}`,
      title: `${account.name || 'Unnamed Account'}`,
      date: createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timeAgo: formatDistanceToNow(createdDate),
      description: `${accountTypeLabel} account (${account.account_number || 'No #'}) created.`,
      category: accountTypeLabel,
      status: account.is_active ? 'completed' : 'attention',
      icon: account.account_type === 'organization' ? '🏢' : '👤',
    };
  });

  return { items };
};

// ==================== MEMBER SYNC HANDLERS ====================

/**
 * Get just the sync stats (counts only) for the dashboard.
 * This is optimized to avoid returning large member arrays.
 */
async function getMemberSyncStats(): Promise<{
  totalMembers: number;
  membersWithAccounts: number;
  membersWithoutAccounts: number;
}> {
  console.log('[getMemberSyncStats] Fetching sync stats');
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Fetch members
  const memberService = container.get<MemberService>(TYPES.MemberService);
  const membersResult = await memberService.findAll();
  const totalMembers = membersResult.data?.length || 0;

  // Fetch accounts to get member_id mappings
  const accountService = container.get<AccountService>(TYPES.AccountService);
  const accountsResult = await accountService.findAll();
  const accounts = accountsResult.data || [];

  // Create a set of member IDs that have accounts (only need IDs, not full objects)
  const memberIdsWithAccounts = new Set<string>();
  for (const a of accounts) {
    if (a.member_id) {
      memberIdsWithAccounts.add(a.member_id);
    }
  }

  // Count members with accounts using only IDs
  let membersWithAccountsCount = 0;
  if (membersResult.data) {
    for (const m of membersResult.data) {
      if (memberIdsWithAccounts.has(m.id)) {
        membersWithAccountsCount++;
      }
    }
  }

  const stats = {
    totalMembers,
    membersWithAccounts: membersWithAccountsCount,
    membersWithoutAccounts: totalMembers - membersWithAccountsCount,
  };

  console.log('[getMemberSyncStats] Stats:', stats);
  return stats;
}

/**
 * Helper to get members without linked accounts (for sync action).
 * Returns full member objects for the sync operation.
 * Note: This function needs to return full member objects for the sync operation,
 * so we can't use the lightweight stats approach here.
 */
async function getMembersWithoutAccounts(): Promise<{
  members: Member[];
  totalMembers: number;
  membersWithAccounts: number;
  membersWithoutAccounts: number;
}> {
  console.log('[getMembersWithoutAccounts] Fetching members without accounts');
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Fetch members
  const memberService = container.get<MemberService>(TYPES.MemberService);
  const membersResult = await memberService.findAll();
  const allMembers = membersResult.data || [];

  // Fetch accounts to get member_id mappings
  const accountService = container.get<AccountService>(TYPES.AccountService);
  const accountsResult = await accountService.findAll();
  const accounts = accountsResult.data || [];

  // Create a set of member IDs that have accounts
  const memberIdsWithAccounts = new Set<string>();
  for (const a of accounts) {
    if (a.member_id) {
      memberIdsWithAccounts.add(a.member_id);
    }
  }

  // Filter members that have linked accounts
  const membersWithAccountsList = allMembers.filter(
    m => memberIdsWithAccounts.has(m.id)
  );

  // Filter members without accounts
  const membersWithoutAccountsList = allMembers.filter(
    m => !memberIdsWithAccounts.has(m.id)
  );

  console.log('[getMembersWithoutAccounts] Found', membersWithoutAccountsList.length, 'members without accounts');

  return {
    members: membersWithoutAccountsList,
    totalMembers: allMembers.length,
    membersWithAccounts: membersWithAccountsList.length,
    membersWithoutAccounts: membersWithoutAccountsList.length,
  };
}

/**
 * Dashboard Sync Stats Handler - Shows members without accounts
 * Uses optimized stats-only function to avoid processing large member arrays
 */
const resolveAccountsDashboardSyncStats: ServiceDataSourceHandler = async (_request) => {
  console.log('[resolveAccountsDashboardSyncStats] START');
  // Use optimized stats function that only returns counts
  const stats = await getMemberSyncStats();
  console.log('[resolveAccountsDashboardSyncStats] Got stats:', stats);

  return {
    title: 'Member account sync',
    description: 'Create accounts for members who don\'t have linked accounts yet.',
    totalMembers: stats.totalMembers,
    membersWithAccounts: stats.membersWithAccounts,
    membersWithoutAccounts: stats.membersWithoutAccounts,
    syncAvailable: stats.membersWithoutAccounts > 0,
    message: stats.membersWithoutAccounts > 0
      ? `${stats.membersWithoutAccounts} member${stats.membersWithoutAccounts === 1 ? '' : 's'} can be synced to create accounts.`
      : 'All members have linked accounts.',
  };
};

/**
 * Sync Members to Accounts Handler
 * Creates accounts for all members who don't have linked accounts
 */
const syncMembersToAccounts: ServiceDataSourceHandler = async (_request) => {
  console.log('[syncMembersToAccounts] Starting member to account sync...');

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const accountService = container.get<AccountService>(TYPES.AccountService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    // Get members without accounts
    const { members: membersToSync } = await getMembersWithoutAccounts();

    if (membersToSync.length === 0) {
      return {
        success: true,
        message: 'All members already have linked accounts.',
        created: 0,
        failed: 0,
        errors: [],
      };
    }

    console.log(`[syncMembersToAccounts] Found ${membersToSync.length} members without accounts`);

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    // Create accounts for each member
    for (const member of membersToSync) {
      try {
        const memberName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Unnamed Member';

        // Generate account number
        const generateResult = await accountService.generateAccountNumber({
          pageId: 'sync-members',
          changedField: 'name',
          model: {
            name: memberName,
            account_type: 'person',
          },
        });

        // Build address from member fields
        const addressParts = [
          member.address_street,
          member.address_street2,
          member.address_city,
          member.address_state,
          member.address_postal_code,
          member.address_country,
        ].filter(Boolean);
        const address = addressParts.length > 0 ? addressParts.join(', ') : null;

        // Create account data
        const accountData: Partial<Account> = {
          tenant_id: tenant.id,
          name: memberName,
          account_type: 'person',
          account_number: generateResult.updatedFields.account_number || `PER-MBR-${Date.now()}`,
          description: `Account created from member record`,
          email: member.email || null,
          phone: member.contact_number || null,
          address: address,
          website: null,
          tax_id: null,
          is_active: true,
          notes: `Auto-generated from member: ${member.id}`,
          member_id: member.id,
        };

        await accountService.create(accountData);
        created++;

        console.log(`[syncMembersToAccounts] Created account for member: ${member.id} (${memberName})`);
      } catch (error: any) {
        failed++;
        const errorMsg = `Failed to create account for ${member.first_name} ${member.last_name}: ${error?.message || 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[syncMembersToAccounts] ${errorMsg}`);
      }
    }

    console.log(`[syncMembersToAccounts] Sync complete. Created: ${created}, Failed: ${failed}`);

    return {
      success: failed === 0,
      message: failed === 0
        ? `Successfully created ${created} account${created === 1 ? '' : 's'} from members.`
        : `Created ${created} account${created === 1 ? '' : 's'}, ${failed} failed.`,
      created,
      failed,
      errors: errors.slice(0, 5), // Limit error messages
    };
  } catch (error: any) {
    console.error('[syncMembersToAccounts] Sync failed:', error);

    return {
      success: false,
      message: error?.message || 'Failed to sync members to accounts.',
      created: 0,
      failed: 0,
      errors: [error?.message || 'Unknown error'],
    };
  }
};

/**
 * Delete Account Handler
 */
const deleteAccount: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.id as string;

  if (!accountId) {
    return {
      success: false,
      message: 'Account ID is required',
    };
  }

  console.log('[deleteAccount] Deleting account:', accountId);

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const accountService = container.get<AccountService>(TYPES.AccountService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    await accountService.delete(accountId);

    console.log('[deleteAccount] Account deleted successfully:', accountId);

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  } catch (error: any) {
    console.error('[deleteAccount] Failed to delete account:', error);

    return {
      success: false,
      message: error?.message || 'Failed to delete account',
    };
  }
};

// Export all handlers
export const adminCommunityAccountsHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-community.accounts.list.hero': resolveAccountsListHero,
  'admin-community.accounts.list.table': resolveAccountsListTable,
  // Manage page handlers
  'admin-community.accounts.manage.hero': resolveAccountManageHero,
  'admin-community.accounts.manage.form': resolveAccountManageForm,
  'admin-community.accounts.manage.save': saveAccount,
  // Profile page handlers
  'admin-community.accounts.profile.hero': resolveAccountProfileHero,
  'admin-community.accounts.profile.summary': resolveAccountProfileSummary,
  // Dashboard page handlers
  'admin-community.accounts.dashboard.hero': resolveAccountsDashboardHero,
  'admin-community.accounts.dashboard.kpis': resolveAccountsDashboardKpis,
  'admin-community.accounts.dashboard.quickLinks': resolveAccountsDashboardQuickLinks,
  'admin-community.accounts.dashboard.breakdown': resolveAccountsDashboardBreakdown,
  'admin-community.accounts.dashboard.timeline': resolveAccountsDashboardTimeline,
  // Sync handlers
  'admin-community.accounts.dashboard.syncStats': resolveAccountsDashboardSyncStats,
  'admin-community.accounts.dashboard.syncMembers': syncMembersToAccounts,
  // Delete handler
  'admin-community.accounts.delete': deleteAccount,
};
