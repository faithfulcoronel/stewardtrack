import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { FinancialSourceService } from '@/services/FinancialSourceService';
import type { FinancialSource, SourceType } from '@/models/financialSource.model';
import { getTenantCurrency, formatCurrency } from './finance-utils';

function getSourceTypeLabel(type: SourceType): string {
  const labels: Record<SourceType, string> = {
    bank: 'Bank Account',
    fund: 'Fund',
    wallet: 'Digital Wallet',
    cash: 'Cash',
    online: 'Online Payment',
    other: 'Other',
  };
  return labels[type] || type;
}

function getSourceTypeBadgeVariant(type: SourceType): string {
  const variants: Record<SourceType, string> = {
    bank: 'info',
    fund: 'success',
    wallet: 'warning',
    cash: 'neutral',
    online: 'positive',
    other: 'neutral',
  };
  return variants[type] || 'neutral';
}

// ==================== LIST PAGE HANDLERS ====================

const resolveSourcesListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  const sources = await sourceService.findAll();
  const allSources = sources.data || [];
  const totalCount = allSources.length;
  const activeCount = allSources.filter((s) => s.is_active).length;
  const bankCount = allSources.filter((s) => s.source_type === 'bank').length;

  return {
    eyebrow: 'Financial sources',
    headline: 'Manage your money sources',
    description: 'Track bank accounts, cash funds, digital wallets, and other financial sources.',
    metrics: [
      {
        label: 'Total sources',
        value: totalCount.toString(),
        caption: `${activeCount} active`,
      },
      {
        label: 'Bank accounts',
        value: bankCount.toString(),
        caption: 'Connected banks',
      },
      {
        label: 'Total balance',
        value: formatCurrency(0, currency),
        caption: 'Across all sources',
      },
    ],
  };
};

const resolveSourcesListTypeSummary: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const sources = await sourceService.findAll();
  const allSources = sources.data || [];

  const byType: Record<SourceType, number> = {
    bank: 0,
    fund: 0,
    wallet: 0,
    cash: 0,
    online: 0,
    other: 0,
  };

  for (const source of allSources) {
    if (source.source_type in byType) {
      byType[source.source_type]++;
    }
  }

  return {
    items: [
      {
        id: 'type-bank',
        label: 'Bank accounts',
        value: byType.bank.toString(),
        change: '',
        changeLabel: 'sources',
        trend: 'flat',
        tone: 'informative',
        description: 'Traditional bank accounts.',
      },
      {
        id: 'type-cash',
        label: 'Cash funds',
        value: byType.cash.toString(),
        change: '',
        changeLabel: 'sources',
        trend: 'flat',
        tone: 'neutral',
        description: 'Physical cash holdings.',
      },
      {
        id: 'type-wallet',
        label: 'Digital wallets',
        value: byType.wallet.toString(),
        change: '',
        changeLabel: 'sources',
        trend: 'flat',
        tone: 'warning',
        description: 'Digital payment platforms.',
      },
      {
        id: 'type-online',
        label: 'Online payments',
        value: byType.online.toString(),
        change: '',
        changeLabel: 'sources',
        trend: 'flat',
        tone: 'positive',
        description: 'Online payment processors.',
      },
    ],
  };
};

const resolveSourcesListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const sources = await sourceService.findAll();
  const allSources = sources.data || [];

  const rows = allSources.map((source) => ({
    id: source.id,
    name: source.name || 'Unnamed Source',
    sourceType: getSourceTypeLabel(source.source_type),
    sourceTypeKey: source.source_type,
    sourceTypeBadgeVariant: getSourceTypeBadgeVariant(source.source_type),
    accountNumber: source.account_number ? '••••' + source.account_number.slice(-4) : '—',
    linkedAccount: source.chart_of_accounts?.name || '—',
    isActive: source.is_active,
    status: source.is_active ? 'Active' : 'Inactive',
    statusVariant: source.is_active ? 'success' : 'neutral',
    description: source.description || '',
  }));

  const columns = [
    {
      field: 'name',
      headerName: 'Source name',
      type: 'link',
      hrefTemplate: '/admin/finance/sources/{{id}}',
      subtitleField: 'description',
      flex: 1.5,
    },
    {
      field: 'sourceType',
      headerName: 'Type',
      type: 'badge',
      badgeVariantField: 'sourceTypeBadgeVariant',
      flex: 0.8,
    },
    {
      field: 'accountNumber',
      headerName: 'Account #',
      type: 'text',
      flex: 0.8,
    },
    {
      field: 'linkedAccount',
      headerName: 'GL Account',
      type: 'text',
      flex: 1,
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
          urlTemplate: '/admin/finance/sources/{{id}}',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/sources/manage?sourceId={{id}}',
          variant: 'secondary',
        },
        {
          id: 'delete-record',
          label: 'Delete',
          intent: 'delete',
          handler: 'admin-finance.sources.delete',
          confirmTitle: 'Delete Source',
          confirmDescription: 'Are you sure you want to delete "{{name}}"?',
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
      placeholder: 'Search by name...',
    },
    {
      id: 'sourceType',
      type: 'select',
      placeholder: 'Source type',
      options: [
        { label: 'All types', value: 'all' },
        { label: 'Bank Account', value: 'bank' },
        { label: 'Cash', value: 'cash' },
        { label: 'Digital Wallet', value: 'wallet' },
        { label: 'Online Payment', value: 'online' },
        { label: 'Fund', value: 'fund' },
        { label: 'Other', value: 'other' },
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

// ==================== MANAGE PAGE HANDLERS ====================

const resolveSourceManageHeader: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.sourceId as string;

  if (!sourceId) {
    return {
      eyebrow: 'Financial sources',
      headline: 'Add new source',
      description: 'Create a new financial source for tracking money.',
    };
  }

  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);
  const source = await sourceService.findById(sourceId);

  if (!source) {
    throw new Error('Source not found');
  }

  return {
    eyebrow: 'Edit source',
    headline: `Update ${source.name || 'source'}`,
    description: `Modify the ${getSourceTypeLabel(source.source_type).toLowerCase()} configuration.`,
  };
};

const resolveSourceManageForm: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.sourceId as string;
  const isCreate = !sourceId;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let source: Partial<FinancialSource> = {};

  if (sourceId) {
    const existing = await sourceService.findById(sourceId);
    if (existing) {
      source = existing;
    }
  }

  return {
    fields: [
      ...(sourceId
        ? [
            {
              name: 'sourceId',
              type: 'hidden' as const,
            },
          ]
        : []),
      {
        name: 'name',
        label: 'Source name',
        type: 'text',
        colSpan: 'half',
        placeholder: 'e.g., Main Checking Account',
        helperText: 'Descriptive name for this source',
        required: true,
      },
      {
        name: 'sourceType',
        label: 'Source type',
        type: 'select',
        colSpan: 'half',
        helperText: 'Type of financial source',
        required: true,
        options: [
          { value: 'bank', label: 'Bank Account' },
          { value: 'cash', label: 'Cash' },
          { value: 'wallet', label: 'Digital Wallet' },
          { value: 'online', label: 'Online Payment' },
          { value: 'fund', label: 'Fund' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        name: 'accountNumber',
        label: 'Account number',
        type: 'text',
        colSpan: 'half',
        placeholder: 'Account number (encrypted)',
        helperText: 'Optional account identifier',
      },
      {
        name: 'isActive',
        label: 'Active',
        type: 'toggle',
        colSpan: 'half',
        helperText: 'Active sources can be used in transactions',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        colSpan: 'full',
        placeholder: 'Additional notes about this source...',
        helperText: 'Optional description',
        rows: 3,
      },
    ],
    values: {
      ...(sourceId ? { sourceId: source.id } : {}),
      name: source.name || '',
      sourceType: source.source_type || 'bank',
      accountNumber: source.account_number || '',
      isActive: source.is_active ?? true,
      description: source.description || '',
    },
    validation: {
      name: { required: true, minLength: 1 },
      sourceType: { required: true },
    },
  };
};

// ==================== PROFILE PAGE HANDLERS ====================

const resolveSourceProfileHeader: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.sourceId as string;

  if (!sourceId) {
    throw new Error('Source ID is required');
  }

  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);
  const source = await sourceService.findById(sourceId);

  if (!source) {
    throw new Error('Source not found');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  return {
    eyebrow: getSourceTypeLabel(source.source_type),
    headline: source.name || 'Unnamed Source',
    description: source.description || 'Financial source',
    metrics: [
      {
        label: 'Balance',
        value: formatCurrency(0, currency),
        caption: 'Current balance',
      },
      {
        label: 'Type',
        value: getSourceTypeLabel(source.source_type),
        caption: 'Source type',
      },
      {
        label: 'Account',
        value: source.account_number ? '••••' + source.account_number.slice(-4) : '—',
        caption: 'Account number',
      },
    ],
  };
};

const resolveSourceProfileDetails: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.sourceId as string;

  if (!sourceId) {
    throw new Error('Source ID is required');
  }

  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);
  const source = await sourceService.findById(sourceId);

  if (!source) {
    throw new Error('Source not found');
  }

  return {
    panels: [
      {
        id: 'source-info',
        title: 'Source information',
        description: 'Basic source configuration',
        columns: 2,
        items: [
          { label: 'Source name', value: source.name || '—', type: 'text' },
          { label: 'Source type', value: getSourceTypeLabel(source.source_type), type: 'badge', badgeVariant: getSourceTypeBadgeVariant(source.source_type) },
          { label: 'Account number', value: source.account_number ? '••••' + source.account_number.slice(-4) : '—', type: 'text' },
          { label: 'Status', value: source.is_active ? 'Active' : 'Inactive', type: 'badge', badgeVariant: source.is_active ? 'success' : 'neutral' },
          { label: 'Description', value: source.description || 'No description', type: 'multiline' },
        ],
      },
    ],
  };
};

const resolveSourceProfileLinkedAccount: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.sourceId as string;

  if (!sourceId) {
    throw new Error('Source ID is required');
  }

  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);
  const source = await sourceService.findById(sourceId);

  if (!source) {
    throw new Error('Source not found');
  }

  const linkedAccount = source.chart_of_accounts;

  return {
    items: [
      {
        id: 'linked-account',
        label: 'GL Account',
        value: linkedAccount?.name || 'Not linked',
        change: linkedAccount?.code || '',
        changeLabel: 'account code',
        trend: 'flat',
        tone: linkedAccount ? 'positive' : 'neutral',
        description: linkedAccount
          ? 'This source is linked to a general ledger account.'
          : 'This source is not linked to a GL account.',
      },
    ],
  };
};

const resolveSourceProfileTransactions: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'date', headerName: 'Date', type: 'text', flex: 0.8 },
      { field: 'description', headerName: 'Description', type: 'text', flex: 1.5 },
      { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
      { field: 'type', headerName: 'Type', type: 'badge', flex: 0.6 },
    ],
    filters: [],
  };
};

// ==================== ACTION HANDLERS ====================

const saveSource: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const values = (params.values ?? params) as Record<string, unknown>;
  const sourceId = (values.sourceId ?? params.sourceId) as string | undefined;

  console.log('[saveSource] Saving source. ID:', sourceId, 'Values:', values);

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const sourceData: Partial<FinancialSource> = {
      name: values.name as string,
      source_type: values.sourceType as SourceType,
      account_number: values.accountNumber ? (values.accountNumber as string) : null,
      is_active: values.isActive === true || values.isActive === 'true',
      description: values.description ? (values.description as string) : null,
    };

    let source: FinancialSource;

    if (sourceId) {
      source = await sourceService.update(sourceId, sourceData);
    } else {
      source = await sourceService.create(sourceData);
    }

    console.log('[saveSource] Source saved:', source.id);

    return {
      success: true,
      message: sourceId ? 'Source updated successfully' : 'Source created successfully',
      sourceId: source.id,
      redirectUrl: '/admin/finance/sources',
    };
  } catch (error: any) {
    console.error('[saveSource] Failed:', error);

    return {
      success: false,
      message: error?.message || 'Failed to save source',
    };
  }
};

const deleteSource: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.id as string;

  if (!sourceId) {
    return {
      success: false,
      message: 'Source ID is required',
    };
  }

  console.log('[deleteSource] Deleting source:', sourceId);

  try {
    const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);
    await sourceService.delete(sourceId);

    console.log('[deleteSource] Source deleted:', sourceId);

    return {
      success: true,
      message: 'Source deleted successfully',
    };
  } catch (error: any) {
    console.error('[deleteSource] Failed:', error);

    return {
      success: false,
      message: error?.message || 'Failed to delete source',
    };
  }
};

// Export all handlers
export const adminFinanceSourcesHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-finance.sources.list.hero': resolveSourcesListHero,
  'admin-finance.sources.list.typeSummary': resolveSourcesListTypeSummary,
  'admin-finance.sources.list.table': resolveSourcesListTable,
  // Profile page handlers
  'admin-finance.sources.profile.header': resolveSourceProfileHeader,
  'admin-finance.sources.profile.details': resolveSourceProfileDetails,
  'admin-finance.sources.profile.linkedAccount': resolveSourceProfileLinkedAccount,
  'admin-finance.sources.profile.transactions': resolveSourceProfileTransactions,
  // Manage page handlers
  'admin-finance.sources.manage.header': resolveSourceManageHeader,
  'admin-finance.sources.manage.form': resolveSourceManageForm,
  // Action handlers
  'admin-finance.sources.save': saveSource,
  'admin-finance.sources.delete': deleteSource,
};
