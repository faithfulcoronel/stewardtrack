import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { ChartOfAccountService } from '@/services/ChartOfAccountService';
import type { ChartOfAccount, AccountType } from '@/models/chartOfAccount.model';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';

function getAccountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    asset: 'Asset',
    liability: 'Liability',
    equity: 'Equity',
    revenue: 'Revenue',
    expense: 'Expense',
  };
  return labels[type] || type;
}

function getAccountTypeBadgeVariant(type: AccountType): string {
  const variants: Record<AccountType, string> = {
    asset: 'success',
    liability: 'warning',
    equity: 'info',
    revenue: 'positive',
    expense: 'negative',
  };
  return variants[type] || 'neutral';
}

// ==================== LIST PAGE HANDLERS ====================

const resolveAccountsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const accounts = await coaService.findAll();
  const allAccounts = accounts.data || [];
  const totalCount = allAccounts.length;
  const activeCount = allAccounts.filter((a) => a.is_active).length;

  // Count by type
  const assetCount = allAccounts.filter((a) => a.account_type === 'asset').length;
  const liabilityCount = allAccounts.filter((a) => a.account_type === 'liability').length;
  const equityCount = allAccounts.filter((a) => a.account_type === 'equity').length;
  const revenueCount = allAccounts.filter((a) => a.account_type === 'revenue').length;
  const expenseCount = allAccounts.filter((a) => a.account_type === 'expense').length;

  return {
    eyebrow: 'Chart of accounts',
    headline: 'General ledger account structure',
    description: 'Manage your organization\'s chart of accounts for accurate financial tracking.',
    metrics: [
      {
        label: 'Total accounts',
        value: totalCount.toString(),
        caption: `${activeCount} active`,
      },
      {
        label: 'Asset accounts',
        value: assetCount.toString(),
        caption: 'Cash, receivables, property',
      },
      {
        label: 'Liability accounts',
        value: liabilityCount.toString(),
        caption: 'Payables, loans, obligations',
      },
    ],
  };
};

const resolveAccountsListTypeSummary: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const accounts = await coaService.findAll();
  const allAccounts = accounts.data || [];

  // Group by type
  const byType: Record<AccountType, number> = {
    asset: 0,
    liability: 0,
    equity: 0,
    revenue: 0,
    expense: 0,
  };

  for (const account of allAccounts) {
    if (account.account_type in byType) {
      byType[account.account_type]++;
    }
  }

  return {
    items: [
      {
        id: 'type-assets',
        label: 'Assets',
        value: byType.asset.toString(),
        change: '',
        changeLabel: 'accounts',
        trend: 'flat',
        tone: 'positive',
        description: 'Resources owned by the organization.',
      },
      {
        id: 'type-liabilities',
        label: 'Liabilities',
        value: byType.liability.toString(),
        change: '',
        changeLabel: 'accounts',
        trend: 'flat',
        tone: 'warning',
        description: 'Obligations owed to others.',
      },
      {
        id: 'type-equity',
        label: 'Equity',
        value: byType.equity.toString(),
        change: '',
        changeLabel: 'accounts',
        trend: 'flat',
        tone: 'informative',
        description: 'Net worth and retained earnings.',
      },
      {
        id: 'type-revenue',
        label: 'Revenue',
        value: byType.revenue.toString(),
        change: '',
        changeLabel: 'accounts',
        trend: 'flat',
        tone: 'positive',
        description: 'Income and contribution categories.',
      },
      {
        id: 'type-expenses',
        label: 'Expenses',
        value: byType.expense.toString(),
        change: '',
        changeLabel: 'accounts',
        trend: 'flat',
        tone: 'neutral',
        description: 'Cost and spending categories.',
      },
    ],
  };
};

const resolveAccountsListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const accounts = await coaService.findAll();
  const allAccounts = accounts.data || [];

  const rows = allAccounts.map((account) => ({
    id: account.id,
    code: account.code || '—',
    name: account.name || 'Unnamed Account',
    accountType: getAccountTypeLabel(account.account_type),
    accountTypeKey: account.account_type,
    accountTypeBadgeVariant: getAccountTypeBadgeVariant(account.account_type),
    subtype: account.account_subtype || '—',
    parentName: account.parent?.name || '—',
    parentId: account.parent_id,
    isActive: account.is_active,
    status: account.is_active ? 'Active' : 'Inactive',
    statusVariant: account.is_active ? 'success' : 'neutral',
    description: account.description || '',
  }));

  const columns = [
    {
      field: 'code',
      headerName: 'Code',
      type: 'text',
      flex: 0.6,
      hideOnMobile: true,
    },
    {
      field: 'name',
      headerName: 'Account name',
      type: 'link',
      hrefTemplate: '/admin/finance/accounts/{{id}}',
      subtitleField: 'description',
      flex: 1.5,
    },
    {
      field: 'accountType',
      headerName: 'Type',
      type: 'badge',
      badgeVariantField: 'accountTypeBadgeVariant',
      flex: 0.8,
    },
    {
      field: 'subtype',
      headerName: 'Subtype',
      type: 'text',
      flex: 0.8,
      hideOnMobile: true,
    },
    {
      field: 'parentName',
      headerName: 'Parent',
      type: 'text',
      flex: 1,
      hideOnMobile: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'badge',
      badgeVariantField: 'statusVariant',
      flex: 0.6,
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
          urlTemplate: '/admin/finance/accounts/{{id}}',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/accounts/manage?accountId={{id}}',
          variant: 'secondary',
        },
        {
          id: 'delete-record',
          label: 'Delete',
          intent: 'delete',
          handler: 'admin-finance.accounts.delete',
          confirmTitle: 'Delete Account',
          confirmDescription: 'Are you sure you want to delete "{{name}}"? This cannot be undone.',
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
      placeholder: 'Search by code or name...',
    },
    {
      id: 'accountType',
      type: 'select',
      placeholder: 'Account type',
      options: [
        { label: 'All types', value: 'all' },
        { label: 'Asset', value: 'asset' },
        { label: 'Liability', value: 'liability' },
        { label: 'Equity', value: 'equity' },
        { label: 'Revenue', value: 'revenue' },
        { label: 'Expense', value: 'expense' },
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
    rows,
    columns,
    filters,
  };
};

// ==================== PROFILE PAGE HANDLERS ====================

const resolveAccountProfileHeader: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.accountId as string;

  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const account = await coaService.findById(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get account balance
  let balance = 0;
  try {
    const balanceResult = await coaService.getBalance(accountId);
    balance = balanceResult.balance;
  } catch {
    // Balance calculation may fail if no transactions
  }

  return {
    eyebrow: account.code || 'Account',
    headline: account.name || 'Unnamed Account',
    description: account.description || getAccountTypeLabel(account.account_type) + ' account',
    metrics: [
      {
        label: 'Current balance',
        value: formatCurrency(balance, currency),
        caption: 'As of today',
      },
      {
        label: 'Type',
        value: getAccountTypeLabel(account.account_type),
        caption: account.account_subtype || 'General',
      },
      {
        label: 'Status',
        value: account.is_active ? 'Active' : 'Inactive',
        caption: account.is_active ? 'Can be used' : 'Disabled',
      },
    ],
  };
};

const resolveAccountProfileDetails: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.accountId as string;

  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone (cached)
  const timezone = await getTenantTimezone();

  const account = await coaService.findById(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  return {
    panels: [
      {
        id: 'account-info',
        title: 'Account information',
        description: 'Basic account configuration',
        columns: 2,
        items: [
          { label: 'Account code', value: account.code || '—', type: 'text' },
          { label: 'Account name', value: account.name || '—', type: 'text' },
          { label: 'Account type', value: getAccountTypeLabel(account.account_type), type: 'badge', badgeVariant: getAccountTypeBadgeVariant(account.account_type) },
          { label: 'Subtype', value: account.account_subtype || '—', type: 'text' },
          { label: 'Parent account', value: account.parent?.name || 'None (top-level)', type: 'text' },
          { label: 'Status', value: account.is_active ? 'Active' : 'Inactive', type: 'badge', badgeVariant: account.is_active ? 'success' : 'neutral' },
          { label: 'Description', value: account.description || 'No description', type: 'multiline' },
        ],
      },
      {
        id: 'audit-info',
        title: 'Record information',
        description: 'Audit trail',
        columns: 2,
        items: [
          { label: 'Created', value: account.created_at ? formatDate(new Date(account.created_at), timezone) : '—', type: 'text' },
          { label: 'Last updated', value: account.updated_at ? formatDate(new Date(account.updated_at), timezone) : '—', type: 'text' },
        ],
      },
    ],
  };
};

const resolveAccountProfileBalanceSummary: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.accountId as string;

  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Placeholder - will calculate from transactions
  return {
    items: [
      {
        id: 'debit-total',
        label: 'Total debits',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'all time',
        trend: 'flat',
        tone: 'neutral',
        description: 'Sum of all debit entries.',
      },
      {
        id: 'credit-total',
        label: 'Total credits',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'all time',
        trend: 'flat',
        tone: 'neutral',
        description: 'Sum of all credit entries.',
      },
      {
        id: 'net-balance',
        label: 'Net balance',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'current',
        trend: 'flat',
        tone: 'informative',
        description: 'Debits minus credits.',
      },
    ],
  };
};

const resolveAccountProfileTransactions: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.accountId as string;

  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency and timezone (cached)
  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  // Get transactions for this account
  let transactions: any[] = [];
  try {
    transactions = await coaService.getTransactions(accountId);
  } catch {
    // May fail if no transactions
  }

  const rows = transactions.map((tx, index) => ({
    id: `tx-${index}`,
    date: tx.date ? formatDate(new Date(tx.date), timezone) : '—',
    transactionNumber: tx.transaction_number || '—',
    description: tx.description || '—',
    debit: tx.transaction_type === 'debit' ? formatCurrency(tx.amount, currency) : '',
    credit: tx.transaction_type === 'credit' ? formatCurrency(tx.amount, currency) : '',
    status: tx.status || 'posted',
    statusVariant: tx.status === 'posted' ? 'success' : 'warning',
  }));

  const columns = [
    { field: 'date', headerName: 'Date', type: 'text', flex: 0.8 },
    { field: 'transactionNumber', headerName: 'Transaction #', type: 'text', flex: 0.8 },
    { field: 'description', headerName: 'Description', type: 'text', flex: 1.5 },
    { field: 'debit', headerName: 'Debit', type: 'currency', flex: 0.8 },
    { field: 'credit', headerName: 'Credit', type: 'currency', flex: 0.8 },
    { field: 'status', headerName: 'Status', type: 'badge', badgeVariantField: 'statusVariant', flex: 0.6 },
  ];

  const filters = [
    {
      id: 'dateRange',
      type: 'dateRange',
      placeholder: 'Filter by date range',
    },
  ];

  return {
    rows,
    columns,
    filters,
  };
};

// ==================== MANAGE PAGE HANDLERS ====================

const resolveAccountManageHeader: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.accountId as string;

  if (!accountId) {
    return {
      eyebrow: 'Chart of accounts',
      headline: 'Create new account',
      description: 'Add a new account to your chart of accounts.',
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const account = await coaService.findById(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  return {
    eyebrow: 'Edit account',
    headline: `Update ${account.name || 'account'}`,
    description: `Modify the ${getAccountTypeLabel(account.account_type).toLowerCase()} account configuration.`,
  };
};

const resolveAccountManageForm: ServiceDataSourceHandler = async (request) => {
  const accountId = request.params?.accountId as string;
  const isCreate = !accountId;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let account: Partial<ChartOfAccount> = {};

  if (accountId) {
    const existing = await coaService.findById(accountId);
    if (existing) {
      account = existing;
    }
  }

  // Get parent account options
  const allAccounts = await coaService.findAll();
  const parentOptions = [
    { value: '', label: 'None (top-level account)' },
    ...(allAccounts.data || [])
      .filter((a) => a.id !== accountId) // Exclude self
      .map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
      })),
  ];

  return {
    fields: [
      ...(accountId
        ? [
            {
              name: 'accountId',
              type: 'hidden' as const,
            },
          ]
        : []),
      {
        name: 'code',
        label: 'Account code',
        type: 'text',
        colSpan: 'half',
        placeholder: 'e.g., 1000',
        helperText: 'Unique identifier for this account',
        required: true,
      },
      {
        name: 'name',
        label: 'Account name',
        type: 'text',
        colSpan: 'half',
        placeholder: 'e.g., Cash on Hand',
        helperText: 'Descriptive name for this account',
        required: true,
      },
      {
        name: 'accountType',
        label: 'Account type',
        type: 'select',
        colSpan: 'half',
        helperText: 'Classification for financial reporting',
        required: true,
        options: [
          { value: 'asset', label: 'Asset' },
          { value: 'liability', label: 'Liability' },
          { value: 'equity', label: 'Equity' },
          { value: 'revenue', label: 'Revenue' },
          { value: 'expense', label: 'Expense' },
        ],
      },
      {
        name: 'accountSubtype',
        label: 'Account subtype',
        type: 'text',
        colSpan: 'half',
        placeholder: 'e.g., Current Asset',
        helperText: 'Optional subcategory',
      },
      {
        name: 'parentId',
        label: 'Parent account',
        type: 'select',
        colSpan: 'half',
        helperText: 'Hierarchy parent for grouping',
        options: parentOptions,
      },
      {
        name: 'isActive',
        label: 'Active',
        type: 'toggle',
        colSpan: 'half',
        helperText: 'Active accounts can be used in transactions',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        colSpan: 'full',
        placeholder: 'Describe the purpose of this account...',
        helperText: 'Optional notes about this account',
        rows: 3,
      },
    ],
    values: {
      ...(accountId ? { accountId: account.id } : {}),
      code: account.code || '',
      name: account.name || '',
      accountType: account.account_type || 'asset',
      accountSubtype: account.account_subtype || '',
      parentId: account.parent_id || '',
      isActive: account.is_active ?? true,
      description: account.description || '',
    },
    validation: {
      code: { required: true, minLength: 1 },
      name: { required: true, minLength: 1 },
      accountType: { required: true },
    },
  };
};

// ==================== ACTION HANDLERS ====================

const saveAccount: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const values = (params.values ?? params) as Record<string, unknown>;
  const accountId = (values.accountId ?? params.accountId) as string | undefined;

  console.log('[saveAccount] Saving account. ID:', accountId, 'Mode:', accountId ? 'update' : 'create');

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const accountData: Partial<ChartOfAccount> = {
      code: values.code as string,
      name: values.name as string,
      account_type: values.accountType as AccountType,
      account_subtype: values.accountSubtype ? (values.accountSubtype as string) : null,
      parent_id: values.parentId ? (values.parentId as string) : null,
      is_active: values.isActive === true || values.isActive === 'true',
      description: values.description ? (values.description as string) : null,
    };

    let account: ChartOfAccount;

    if (accountId) {
      account = await coaService.update(accountId, accountData);
    } else {
      account = await coaService.create(accountData);
    }

    console.log('[saveAccount] Account saved:', account.id);

    return {
      success: true,
      message: accountId ? 'Account updated successfully' : 'Account created successfully',
      accountId: account.id,
      redirectUrl: '/admin/finance/chart-of-accounts',
    };
  } catch (error: any) {
    console.error('[saveAccount] Failed:', error);

    return {
      success: false,
      message: error?.message || 'Failed to save account',
      errors: {
        formErrors: [error?.message || 'An error occurred'],
      },
    };
  }
};

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
    const coaService = container.get<ChartOfAccountService>(TYPES.ChartOfAccountService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    await coaService.delete(accountId);

    console.log('[deleteAccount] Account deleted:', accountId);

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  } catch (error: any) {
    console.error('[deleteAccount] Failed:', error);

    return {
      success: false,
      message: error?.message || 'Failed to delete account',
    };
  }
};

// Export all handlers
export const adminFinanceAccountsHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-finance.accounts.list.hero': resolveAccountsListHero,
  'admin-finance.accounts.list.typeSummary': resolveAccountsListTypeSummary,
  'admin-finance.accounts.list.table': resolveAccountsListTable,
  // Profile page handlers
  'admin-finance.accounts.profile.header': resolveAccountProfileHeader,
  'admin-finance.accounts.profile.details': resolveAccountProfileDetails,
  'admin-finance.accounts.profile.balanceSummary': resolveAccountProfileBalanceSummary,
  'admin-finance.accounts.profile.transactions': resolveAccountProfileTransactions,
  // Manage page handlers
  'admin-finance.accounts.manage.header': resolveAccountManageHeader,
  'admin-finance.accounts.manage.form': resolveAccountManageForm,
  // Action handlers
  'admin-finance.accounts.save': saveAccount,
  'admin-finance.accounts.delete': deleteAccount,
};
