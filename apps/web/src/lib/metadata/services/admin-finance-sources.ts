import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { FinancialSourceService } from '@/services/FinancialSourceService';
import type { IIncomeExpenseTransactionRepository } from '@/repositories/incomeExpenseTransaction.repository';
import { type FinancialSource, type SourceType, PH_BANK_CHANNELS } from '@/models/financialSource.model';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';
import { getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';

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
  const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);

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

  // Get total balance across all sources
  const balanceSummary = await incomeExpenseRepo.getAllSourcesBalance(tenant.id);

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
        value: formatCurrency(balanceSummary.total_balance, currency),
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

  // Check user permissions for action visibility using PermissionGate
  const userId = await getCurrentUserId({ optional: true });

  let canManage = false;
  let canDelete = false;

  if (userId && tenant) {
    const [manageResult, deleteResult] = await Promise.all([
      new PermissionGate('finance:manage').check(userId, tenant.id),
      new PermissionGate('finance:delete').check(userId, tenant.id),
    ]);
    canManage = manageResult.allowed;
    canDelete = deleteResult.allowed;
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
      hideOnMobile: true,
    },
    {
      field: 'linkedAccount',
      headerName: 'GL Account',
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
          urlTemplate: '/admin/finance/sources/{{id}}',
        },
        ...(canManage
          ? [
              {
                id: 'edit-record',
                label: 'Edit',
                intent: 'edit',
                urlTemplate: '/admin/finance/sources/manage?sourceId={{id}}',
                variant: 'secondary',
              },
            ]
          : []),
        ...(canDelete
          ? [
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
            ]
          : []),
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

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let source: Partial<FinancialSource> = {};
  let hasLinkedAccount = false;
  let linkedAccountDisplay = '';

  if (sourceId) {
    const existing = await sourceService.findById(sourceId);
    if (existing) {
      source = existing;
      hasLinkedAccount = !!source.coa_id;
      linkedAccountDisplay = source.chart_of_accounts
        ? `${source.chart_of_accounts.code} - ${source.chart_of_accounts.name}`
        : '';
    }
  }

  const fields: Array<Record<string, unknown>> = [
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
      name: 'createAssetAccount',
      label: 'Create asset account',
      type: 'toggle',
      colSpan: 'full',
      helperText: 'Automatically create a linked asset account in the chart of accounts',
      hidden: !!sourceId && !!source.coa_id,
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
  ];

  // Add linked COA account field in edit mode when there's a linked account
  if (sourceId && hasLinkedAccount) {
    fields.push({
      name: 'linkedAccount',
      label: 'Linked GL account',
      type: 'text',
      colSpan: 'full',
      disabled: true,
      helperText: 'The chart of accounts entry linked to this source. This field cannot be changed.',
    });
  }

  // Add payout configuration fields (visible only when sourceType is 'online')
  const onlinePaymentCondition = { field: 'sourceType', equals: 'online' };

  fields.push(
    // Bank/wallet selection
    {
      name: 'xenditChannelCode',
      label: 'Payout bank/wallet',
      type: 'select',
      colSpan: 'half',
      placeholder: 'Select bank or wallet',
      helperText: 'Where donation disbursements will be sent',
      options: PH_BANK_CHANNELS.map((bank) => ({
        value: bank.code,
        label: bank.name,
      })),
      visibleWhen: onlinePaymentCondition,
    },
    // Account holder name
    {
      name: 'bankAccountHolderName',
      label: 'Account holder name',
      type: 'text',
      colSpan: 'half',
      placeholder: 'e.g., Juan Dela Cruz',
      helperText: 'Must match the name on your bank account exactly',
      visibleWhen: onlinePaymentCondition,
    },
    // Account number for payout (different from source account number)
    {
      name: 'payoutAccountNumber',
      label: 'Payout account number',
      type: 'text',
      colSpan: 'half',
      placeholder: 'Bank account number',
      helperText: 'Account number for receiving disbursements (encrypted)',
      visibleWhen: onlinePaymentCondition,
    },
    // Disbursement schedule
    {
      name: 'disbursementSchedule',
      label: 'Disbursement schedule',
      type: 'select',
      colSpan: 'half',
      helperText: 'How often to automatically disburse donations',
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
      ],
      visibleWhen: onlinePaymentCondition,
    },
    // Minimum disbursement amount
    {
      name: 'disbursementMinimumAmount',
      label: 'Minimum amount (PHP)',
      type: 'number',
      colSpan: 'half',
      placeholder: '1000',
      helperText: 'Minimum balance before automatic disbursement',
      visibleWhen: onlinePaymentCondition,
    },
    // Donation destination toggle
    {
      name: 'isDonationDestination',
      label: 'Mark as donation destination',
      type: 'toggle',
      colSpan: 'half',
      helperText: 'Only one source can be the donation destination for disbursements',
      visibleWhen: onlinePaymentCondition,
    }
  );

  return {
    fields,
    values: {
      ...(sourceId ? { sourceId: source.id } : {}),
      name: source.name || '',
      sourceType: source.source_type || 'bank',
      accountNumber: source.account_number || '',
      isActive: source.is_active ?? true,
      createAssetAccount: !sourceId, // Default to true for new sources
      description: source.description || '',
      linkedAccount: linkedAccountDisplay,
      // Payout configuration values
      xenditChannelCode: source.xendit_channel_code || '',
      bankAccountHolderName: source.bank_account_holder_name || '',
      payoutAccountNumber: '', // Never pre-fill - requires re-entry for security
      disbursementSchedule: source.disbursement_schedule || 'manual',
      disbursementMinimumAmount: source.disbursement_minimum_amount || 1000,
      isDonationDestination: source.is_donation_destination ?? false,
    },
    validation: {
      name: { required: true, minLength: 1 },
      sourceType: { required: true },
    },
  };
};

const resolveSourceManagePayoutConfig: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.sourceId as string;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  if (!sourceId) {
    // New source - no payout config yet
    return {
      sourceId: null,
      sourceType: null,
      tenantId: tenant.id,
    };
  }

  const source = await sourceService.findById(sourceId);

  return {
    sourceId: source?.id || null,
    sourceType: source?.source_type || null,
    tenantId: tenant.id,
  };
};

// ==================== PROFILE PAGE HANDLERS ====================

const resolveSourceProfileHeader: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.sourceId as string;

  if (!sourceId) {
    throw new Error('Source ID is required');
  }

  const sourceService = container.get<FinancialSourceService>(TYPES.FinancialSourceService);
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);

  const source = await sourceService.findById(sourceId);

  if (!source) {
    throw new Error('Source not found');
  }

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get balance summary from RPC
  const balanceSummary = await incomeExpenseRepo.getSourceBalance(sourceId, tenant.id);

  return {
    eyebrow: getSourceTypeLabel(source.source_type),
    headline: source.name || 'Unnamed Source',
    description: source.description || 'Financial source',
    metrics: [
      {
        label: 'Balance',
        value: formatCurrency(balanceSummary.balance, currency),
        caption: 'Current balance',
      },
      {
        label: 'Transactions',
        value: balanceSummary.transaction_count.toString(),
        caption: 'Total entries',
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

// Transaction type labels and variants for user-friendly display
function getTransactionTypeDisplay(type: string): { label: string; variant: string; isDebit: boolean } {
  const typeMap: Record<string, { label: string; variant: string; isDebit: boolean }> = {
    income: { label: 'Income', variant: 'success', isDebit: false },
    expense: { label: 'Expense', variant: 'warning', isDebit: true },
    transfer: { label: 'Transfer', variant: 'info', isDebit: false },
    adjustment: { label: 'Adjustment', variant: 'neutral', isDebit: true },
    opening_balance: { label: 'Opening', variant: 'info', isDebit: false },
    closing_entry: { label: 'Closing', variant: 'neutral', isDebit: true },
    fund_rollover: { label: 'Rollover', variant: 'info', isDebit: false },
    reversal: { label: 'Reversal', variant: 'destructive', isDebit: true },
    allocation: { label: 'Allocation', variant: 'neutral', isDebit: true },
    reclass: { label: 'Reclass', variant: 'neutral', isDebit: false },
    refund: { label: 'Refund', variant: 'success', isDebit: false },
  };

  return typeMap[type] || { label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '), variant: 'neutral', isDebit: false };
}

const resolveSourceProfileTransactions: ServiceDataSourceHandler = async (request) => {
  const sourceId = request.params?.sourceId as string;

  const defaultColumns = [
    { field: 'date', headerName: 'Date', type: 'text', flex: 0.7 },
    { field: 'description', headerName: 'Description', type: 'text', flex: 1.2 },
    { field: 'category', headerName: 'Category', type: 'text', flex: 0.8 },
    { field: 'type', headerName: 'Type', type: 'badge', badgeVariantField: 'typeVariant', flex: 0.5 },
    { field: 'amount', headerName: 'Amount', type: 'text', flex: 0.6, align: 'right' },
  ];

  if (!sourceId) {
    return {
      rows: [],
      columns: defaultColumns,
      filters: [],
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    return {
      rows: [],
      columns: defaultColumns,
      filters: [],
    };
  }

  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  // Fetch income/expense transactions for this source using RPC
  const transactions = await incomeExpenseRepo.getBySourceId(sourceId, tenant.id);

  // Map to row format
  const rows = transactions.map((txn, index) => {
    const typeDisplay = getTransactionTypeDisplay(txn.transaction_type);

    // Format amount with sign indicator for debit transactions
    const formattedAmount = formatCurrency(txn.amount, currency);
    const displayAmount = typeDisplay.isDebit ? `(${formattedAmount})` : formattedAmount;

    return {
      id: txn.id || `txn-${index}`,
      date: txn.transaction_date ? formatDate(new Date(txn.transaction_date), timezone) : '—',
      description: txn.description || '—',
      category: txn.category_name || 'Uncategorized',
      categoryCode: txn.category_code || '',
      fund: txn.fund_name || '—',
      type: typeDisplay.label,
      typeVariant: typeDisplay.variant,
      amount: displayAmount,
      rawAmount: txn.amount,
      transactionType: txn.transaction_type,
    };
  });

  return {
    rows,
    columns: defaultColumns,
    filters: [
      {
        id: 'search',
        type: 'search',
        placeholder: 'Search transactions...',
      },
      {
        id: 'type',
        type: 'select',
        placeholder: 'Transaction type',
        field: 'type',
        options: [
          { label: 'All types', value: 'all' },
          { label: 'Income', value: 'Income' },
          { label: 'Expense', value: 'Expense' },
          { label: 'Transfer', value: 'Transfer' },
          { label: 'Adjustment', value: 'Adjustment' },
          { label: 'Refund', value: 'Refund' },
        ],
      },
    ],
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

    const sourceType = values.sourceType as SourceType;
    const isOnlinePayment = sourceType === 'online';

    const sourceData: Partial<FinancialSource> = {
      name: values.name as string,
      source_type: sourceType,
      account_number: values.accountNumber ? (values.accountNumber as string) : null,
      is_active: values.isActive === true || values.isActive === 'true',
      description: values.description ? (values.description as string) : null,
    };

    // Add payout configuration fields for online payment sources
    if (isOnlinePayment) {
      sourceData.xendit_channel_code = values.xenditChannelCode ? (values.xenditChannelCode as string) : null;
      sourceData.bank_account_holder_name = values.bankAccountHolderName ? (values.bankAccountHolderName as string) : null;
      sourceData.disbursement_schedule = values.disbursementSchedule ? (values.disbursementSchedule as 'manual' | 'daily' | 'weekly' | 'monthly') : null;
      sourceData.disbursement_minimum_amount = values.disbursementMinimumAmount ? Number(values.disbursementMinimumAmount) : null;
      sourceData.is_donation_destination = values.isDonationDestination === true || values.isDonationDestination === 'true';
    }

    const createAssetAccount = values.createAssetAccount === true || values.createAssetAccount === 'true';

    let source: FinancialSource;

    if (sourceId) {
      // Use updateWithAccountCheck for updates - it handles creating COA if needed
      source = await sourceService.updateWithAccountCheck(sourceId, {
        ...sourceData,
        auto_create: createAssetAccount,
      });
    } else if (createAssetAccount) {
      // Create source with auto-created asset account
      source = await sourceService.createWithAccount({
        ...sourceData,
        auto_create: true,
      });
    } else {
      source = await sourceService.create(sourceData);
    }

    // Handle encrypted bank account number for online payment sources
    if (isOnlinePayment && values.payoutAccountNumber) {
      const payoutAccountNumber = values.payoutAccountNumber as string;
      if (payoutAccountNumber.trim()) {
        // Update payout configuration with encrypted account number
        await sourceService.updatePayoutConfiguration(source.id, tenant.id, {
          xendit_channel_code: values.xenditChannelCode as string,
          bank_account_holder_name: values.bankAccountHolderName as string,
          bank_account_number: payoutAccountNumber, // Will be encrypted by the service
          disbursement_schedule: (values.disbursementSchedule as 'manual' | 'daily' | 'weekly' | 'monthly') || 'manual',
          disbursement_minimum_amount: Number(values.disbursementMinimumAmount) || 1000,
          is_donation_destination: values.isDonationDestination === true || values.isDonationDestination === 'true',
        });
      }
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
  'admin-finance.sources.manage.payoutConfig': resolveSourceManagePayoutConfig,
  // Action handlers
  'admin-finance.sources.save': saveSource,
  'admin-finance.sources.delete': deleteSource,
};
