import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { FundService } from '@/services/FundService';
import type { IIncomeExpenseTransactionRepository } from '@/repositories/incomeExpenseTransaction.repository';
import type { Fund } from '@/models/fund.model';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';

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

// ==================== LIST PAGE HANDLERS ====================

const resolveFundsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const fundService = container.get<FundService>(TYPES.FundService);
  const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  const funds = await fundService.findAll();
  const allFunds = (funds.data || []) as Fund[];
  const restrictedCount = allFunds.filter((f) => f.type === 'restricted').length;
  const unrestrictedCount = allFunds.filter((f) => f.type === 'unrestricted').length;

  // Get total balance across all funds using RPC
  const balanceSummary = await incomeExpenseRepo.getAllFundsBalance(tenant.id);

  return {
    eyebrow: 'Fund management',
    headline: 'Funds',
    description: 'Manage restricted and unrestricted funds for your organization.',
    metrics: [
      {
        label: 'Total funds',
        value: allFunds.length.toString(),
        caption: 'Defined funds',
      },
      {
        label: 'Restricted',
        value: restrictedCount.toString(),
        caption: 'Designated purpose',
      },
      {
        label: 'Unrestricted',
        value: unrestrictedCount.toString(),
        caption: 'General purpose',
      },
      {
        label: 'Total balance',
        value: formatCurrency(balanceSummary.total_balance, currency),
        caption: 'All funds',
      },
    ],
  };
};

const resolveFundsListTypeSummary: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const fundService = container.get<FundService>(TYPES.FundService);
  const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  const funds = await fundService.findAll();
  const allFunds = (funds.data || []) as Fund[];
  const restrictedFunds = allFunds.filter((f) => f.type === 'restricted');
  const unrestrictedFunds = allFunds.filter((f) => f.type === 'unrestricted');

  // Calculate balances by fund type using RPC (more efficient)
  let restrictedBalance = 0;
  let unrestrictedBalance = 0;

  for (const fund of restrictedFunds) {
    const balance = await incomeExpenseRepo.getFundBalance(fund.id, tenant.id);
    restrictedBalance += balance.balance || 0;
  }

  for (const fund of unrestrictedFunds) {
    const balance = await incomeExpenseRepo.getFundBalance(fund.id, tenant.id);
    unrestrictedBalance += balance.balance || 0;
  }

  return {
    items: [
      {
        id: 'restricted',
        label: 'Restricted funds',
        value: formatCurrency(restrictedBalance, currency),
        change: restrictedFunds.length.toString(),
        changeLabel: 'funds',
        trend: 'flat',
        tone: 'informative',
        description: 'Funds designated for specific purposes.',
      },
      {
        id: 'unrestricted',
        label: 'Unrestricted funds',
        value: formatCurrency(unrestrictedBalance, currency),
        change: unrestrictedFunds.length.toString(),
        changeLabel: 'funds',
        trend: 'flat',
        tone: 'positive',
        description: 'Funds available for general operations.',
      },
    ],
  };
};

const resolveFundsListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const fundService = container.get<FundService>(TYPES.FundService);
  const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  const funds = await fundService.findAll();
  const allFunds = (funds.data || []) as Fund[];

  const rows = await Promise.all(
    allFunds.map(async (fund: Fund) => {
      const balanceSummary = await incomeExpenseRepo.getFundBalance(fund.id, tenant.id);

      return {
        id: fund.id,
        code: fund.code || '—',
        name: fund.name || 'Unnamed Fund',
        description: fund.description || '',
        type: fund.type === 'restricted' ? 'Restricted' : 'Unrestricted',
        typeVariant: fund.type === 'restricted' ? 'warning' : 'success',
        balance: formatCurrency(balanceSummary.balance, currency),
        hasAccount: fund.coa_id ? 'Yes' : 'No',
        hasAccountVariant: fund.coa_id ? 'success' : 'neutral',
      };
    })
  );

  const columns = [
    {
      field: 'code',
      headerName: 'Code',
      type: 'text',
      flex: 0.5,
      hideOnMobile: true,
    },
    {
      field: 'name',
      headerName: 'Fund name',
      type: 'text',
      subtitleField: 'description',
      flex: 1.5,
    },
    {
      field: 'type',
      headerName: 'Type',
      type: 'badge',
      badgeVariantField: 'typeVariant',
      flex: 0.7,
    },
    {
      field: 'balance',
      headerName: 'Balance',
      type: 'text',
      flex: 1,
      align: 'right',
    },
    {
      field: 'hasAccount',
      headerName: 'Equity account',
      type: 'badge',
      badgeVariantField: 'hasAccountVariant',
      flex: 0.7,
      hideOnMobile: true,
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
          urlTemplate: '/admin/finance/funds/{{id}}',
          variant: 'ghost',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/funds/manage?fundId={{id}}',
          variant: 'secondary',
        },
        {
          id: 'delete-record',
          label: 'Delete',
          intent: 'delete',
          handler: 'admin-finance.funds.delete',
          confirmTitle: 'Delete fund',
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
      placeholder: 'Search funds...',
    },
    {
      id: 'type',
      type: 'select',
      placeholder: 'Type',
      options: [
        { label: 'All types', value: 'all' },
        { label: 'Restricted', value: 'restricted' },
        { label: 'Unrestricted', value: 'unrestricted' },
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

const resolveFundManageHeader: ServiceDataSourceHandler = async (request) => {
  const fundId = request.params?.fundId as string;

  if (!fundId) {
    return {
      eyebrow: 'Fund management',
      headline: 'Create fund',
      description: 'Define a new fund for tracking designated or general-purpose resources.',
    };
  }

  const fundService = container.get<FundService>(TYPES.FundService);
  const fund = await fundService.findById(fundId);

  if (!fund) {
    throw new Error('Fund not found');
  }

  return {
    eyebrow: 'Edit fund',
    headline: `Update ${fund.name || 'fund'}`,
    description: 'Modify the fund details and configuration.',
  };
};

const resolveFundManageForm: ServiceDataSourceHandler = async (request) => {
  const fundId = request.params?.fundId as string;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const fundService = container.get<FundService>(TYPES.FundService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let fund: Partial<Fund> = {};

  if (fundId) {
    const existing = await fundService.findById(fundId);
    if (existing) {
      fund = existing;
    }
  }

  return {
    fields: [
      ...(fundId
        ? [
            {
              name: 'fundId',
              type: 'hidden' as const,
            },
          ]
        : []),
      {
        name: 'code',
        label: 'Fund code',
        type: 'text',
        colSpan: 'quarter',
        placeholder: 'e.g., BLDG',
        helperText: 'Short identifier',
        required: true,
      },
      {
        name: 'name',
        label: 'Fund name',
        type: 'text',
        colSpan: 'three-quarters',
        placeholder: 'e.g., Building Fund',
        helperText: 'Full name of the fund',
        required: true,
      },
      {
        name: 'type',
        label: 'Fund type',
        type: 'select',
        colSpan: 'half',
        required: true,
        options: [
          { label: 'Restricted', value: 'restricted' },
          { label: 'Unrestricted', value: 'unrestricted' },
        ],
        helperText: 'Restricted funds have a designated purpose',
      },
      {
        name: 'createEquityAccount',
        label: 'Create equity account',
        type: 'toggle',
        colSpan: 'half',
        helperText: 'Automatically create a linked equity account in the chart of accounts',
        hidden: !!fundId && !!fund.coa_id,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        colSpan: 'full',
        placeholder: 'Purpose and usage notes for this fund...',
        helperText: 'Optional description',
        rows: 3,
      },
    ],
    values: {
      ...(fundId ? { fundId: fund.id } : {}),
      code: fund.code || '',
      name: fund.name || '',
      type: fund.type || 'unrestricted',
      createEquityAccount: !fundId,
      description: fund.description || '',
    },
    validation: {
      code: { required: true, minLength: 1 },
      name: { required: true, minLength: 1 },
      type: { required: true },
    },
  };
};

// ==================== ACTION HANDLERS ====================

const saveFund: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const values = (params.values ?? params) as Record<string, unknown>;
  const fundId = (values.fundId ?? params.fundId) as string | undefined;

  console.log('[saveFund] Saving fund. ID:', fundId, 'Values:', values);

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const fundService = container.get<FundService>(TYPES.FundService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const fundData: Partial<Fund> = {
      code: values.code as string,
      name: values.name as string,
      type: values.type as 'restricted' | 'unrestricted',
      description: values.description ? (values.description as string) : null,
    };

    const createEquityAccount = values.createEquityAccount === true || values.createEquityAccount === 'true';

    let fund: Fund;

    if (fundId) {
      fund = await fundService.updateWithAccountCheck(fundId, fundData);
    } else if (createEquityAccount) {
      fund = await fundService.createWithAccount(fundData);
    } else {
      fund = await fundService.create(fundData);
    }

    console.log('[saveFund] Fund saved:', fund.id);

    return {
      success: true,
      message: fundId ? 'Fund updated successfully' : 'Fund created successfully',
      fundId: fund.id,
      redirectUrl: '/admin/finance/funds',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save fund';
    console.error('[saveFund] Failed:', error);

    return {
      success: false,
      message: errorMessage,
    };
  }
};

const deleteFund: ServiceDataSourceHandler = async (request) => {
  const fundId = request.params?.id as string;

  if (!fundId) {
    return {
      success: false,
      message: 'Fund ID is required',
    };
  }

  console.log('[deleteFund] Deleting fund:', fundId);

  try {
    const fundService = container.get<FundService>(TYPES.FundService);
    await fundService.delete(fundId);

    console.log('[deleteFund] Fund deleted:', fundId);

    return {
      success: true,
      message: 'Fund deleted successfully',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete fund';
    console.error('[deleteFund] Failed:', error);

    return {
      success: false,
      message: errorMessage,
    };
  }
};

// ==================== PROFILE PAGE HANDLERS ====================

const resolveFundProfileHeader: ServiceDataSourceHandler = async (request) => {
  const fundId = request.params?.fundId as string;

  if (!fundId) {
    throw new Error('Fund ID is required');
  }

  const fundService = container.get<FundService>(TYPES.FundService);
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  const fund = await fundService.findById(fundId);
  if (!fund) {
    throw new Error('Fund not found');
  }

  // Get balance summary from RPC
  const balanceSummary = await incomeExpenseRepo.getFundBalance(fundId, tenant.id);

  return {
    eyebrow: `${fund.code} • ${fund.type === 'restricted' ? 'Restricted' : 'Unrestricted'}`,
    headline: fund.name,
    description: fund.description || 'No description provided',
    metrics: [
      {
        label: 'Current balance',
        value: formatCurrency(balanceSummary.balance, currency),
        caption: 'Total fund value',
      },
      {
        label: 'Transactions',
        value: balanceSummary.transaction_count.toString(),
        caption: 'Total entries',
      },
      {
        label: 'Equity account',
        value: fund.coa_id ? 'Linked' : 'None',
        caption: fund.coa_id ? 'Chart of accounts' : 'No account',
      },
    ],
  };
};

const resolveFundProfileDetails: ServiceDataSourceHandler = async (request) => {
  const fundId = request.params?.fundId as string;

  if (!fundId) {
    throw new Error('Fund ID is required');
  }

  const fundService = container.get<FundService>(TYPES.FundService);

  const fund = await fundService.findById(fundId);
  if (!fund) {
    throw new Error('Fund not found');
  }

  return {
    panels: [
      {
        id: 'general-info',
        title: 'General information',
        items: [
          { label: 'Code', value: fund.code },
          { label: 'Name', value: fund.name },
          { label: 'Type', value: fund.type === 'restricted' ? 'Restricted' : 'Unrestricted' },
          { label: 'Description', value: fund.description || 'No description' },
        ],
      },
      {
        id: 'accounting-info',
        title: 'Accounting information',
        items: [
          { label: 'Equity account ID', value: fund.coa_id || 'Not linked' },
          { label: 'Chart of account', value: fund.chart_of_accounts?.name || 'N/A' },
        ],
      },
    ],
  };
};

const resolveFundBalanceSummary: ServiceDataSourceHandler = async (request) => {
  const fundId = request.params?.fundId as string;

  if (!fundId) {
    return { items: [] };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const incomeExpenseRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    return { items: [] };
  }

  // Get balance summary from RPC
  const balanceSummary = await incomeExpenseRepo.getFundBalance(fundId, tenant.id);

  return {
    items: [
      {
        id: 'current-balance',
        label: 'Current balance',
        value: formatCurrency(balanceSummary.balance, currency),
        change: '',
        changeLabel: '',
        trend: 'flat',
        tone: balanceSummary.balance >= 0 ? 'positive' : 'critical',
        description: 'Net fund balance.',
      },
      {
        id: 'total-income',
        label: 'Total income',
        value: formatCurrency(balanceSummary.total_income, currency),
        change: '',
        changeLabel: '',
        trend: 'flat',
        tone: 'positive',
        description: 'All income entries.',
      },
      {
        id: 'total-expense',
        label: 'Total expenses',
        value: formatCurrency(balanceSummary.total_expense, currency),
        change: '',
        changeLabel: '',
        trend: 'flat',
        tone: 'warning',
        description: 'All expense entries.',
      },
    ],
  };
};

const resolveFundTransactionHistory: ServiceDataSourceHandler = async (request) => {
  const fundId = request.params?.fundId as string;

  const defaultColumns = [
    { field: 'date', headerName: 'Date', type: 'text', flex: 0.7 },
    { field: 'description', headerName: 'Description', type: 'text', flex: 1.2 },
    { field: 'category', headerName: 'Category', type: 'text', flex: 0.8 },
    { field: 'source', headerName: 'Source', type: 'text', flex: 0.8 },
    { field: 'type', headerName: 'Type', type: 'badge', badgeVariantField: 'typeVariant', flex: 0.5 },
    { field: 'amount', headerName: 'Amount', type: 'text', flex: 0.6, align: 'right' },
  ];

  if (!fundId) {
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

  // Fetch income/expense transactions for this fund using RPC
  const transactions = await incomeExpenseRepo.getByFundId(fundId, tenant.id);

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
      source: txn.source_name || '—',
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

// Export all handlers
export const adminFinanceFundsHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-finance.funds.list.hero': resolveFundsListHero,
  'admin-finance.funds.list.typeSummary': resolveFundsListTypeSummary,
  'admin-finance.funds.list.table': resolveFundsListTable,
  // Manage page handlers
  'admin-finance.funds.manage.header': resolveFundManageHeader,
  'admin-finance.funds.manage.form': resolveFundManageForm,
  // Profile page handlers
  'admin-finance.funds.profile.header': resolveFundProfileHeader,
  'admin-finance.funds.profile.details': resolveFundProfileDetails,
  'admin-finance.funds.profile.balanceSummary': resolveFundBalanceSummary,
  'admin-finance.funds.profile.transactions': resolveFundTransactionHistory,
  // Action handlers
  'admin-finance.funds.save': saveFund,
  'admin-finance.funds.delete': deleteFund,
};
