import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { IFundRepository } from '@/repositories/fund.repository';
import type { IFinancialSourceRepository } from '@/repositories/financialSource.repository';
import type { IAccountRepository } from '@/repositories/account.repository';
import type { IFinancialTransactionHeaderRepository } from '@/repositories/financialTransactionHeader.repository';
import type { IChartOfAccountRepository } from '@/repositories/chartOfAccount.repository';
import type { IBudgetRepository } from '@/repositories/budget.repository';
import type { FinancialTransactionHeader, TransactionStatus } from '@/models/financialTransactionHeader.model';
import type { TransactionType } from '@/models/financialTransaction.model';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';
import { getCurrentUserId } from '@/lib/server/context';
import {
  notifyTransactionSubmitted,
  notifyTransactionApproved,
  notifyTransactionPosted,
  notifyTransactionVoided,
} from './finance-notifications';

// ==================== LIST PAGE HANDLERS ====================

const resolveTransactionsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Fetch all transaction headers
  const headers = await transactionHeaderRepo.findAll();
  const allHeaders = (headers?.data || []) as FinancialTransactionHeader[];

  // Calculate metrics
  const totalTransactions = allHeaders.length;

  // Get current month date range
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Calculate month-to-date income and expenses
  let mtdIncome = 0;
  let mtdExpenses = 0;

  for (const header of allHeaders) {
    if (header.status === 'posted' || header.status === 'approved') {
      const txnDate = new Date(header.transaction_date);
      if (txnDate >= monthStart && txnDate <= monthEnd) {
        // Get line items to determine if income or expense
        const entries = await transactionHeaderRepo.getTransactionEntries(header.id);
        for (const entry of entries) {
          if (entry.type === 'income') {
            mtdIncome += entry.credit  || 0;
          } else if (entry.type === 'expense') {
            mtdExpenses += entry.debit  || 0;
          }
        }
      }
    }
  }

  return {
    eyebrow: 'Financial transactions',
    headline: 'Track all income and expenses',
    description: 'View, filter, and manage your organization\'s financial transactions.',
    metrics: [
      {
        label: 'Total transactions',
        value: totalTransactions.toString(),
        caption: 'All time',
      },
      {
        label: 'This month income',
        value: formatCurrency(mtdIncome, currency),
        caption: 'Revenue received',
      },
      {
        label: 'This month expenses',
        value: formatCurrency(mtdExpenses, currency),
        caption: 'Costs incurred',
      },
    ],
  };
};

const resolveTransactionsListSummary: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Fetch all transaction headers
  const headers = await transactionHeaderRepo.findAll();
  const allHeaders = (headers?.data || []) as FinancialTransactionHeader[];

  // Get current month date range
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Calculate month-to-date income and expenses
  let mtdIncome = 0;
  let mtdExpenses = 0;

  for (const header of allHeaders) {
    if (header.status === 'posted' || header.status === 'approved') {
      const txnDate = new Date(header.transaction_date);
      if (txnDate >= monthStart && txnDate <= monthEnd) {
        const entries = await transactionHeaderRepo.getTransactionEntries(header.id);
        for (const entry of entries) {
          if (entry.type === 'income') {
            mtdIncome += entry.credit  || 0;
          } else if (entry.type === 'expense') {
            mtdExpenses += entry.debit  || 0;
          }
        }
      }
    }
  }

  const netCashFlow = mtdIncome - mtdExpenses;

  return {
    items: [
      {
        id: 'mtd-income',
        label: 'Month-to-date income',
        value: formatCurrency(mtdIncome, currency),
        change: '',
        changeLabel: 'this month',
        trend: mtdIncome > 0 ? 'up' : 'flat',
        tone: 'positive',
        description: 'Total income for current month.',
      },
      {
        id: 'mtd-expenses',
        label: 'Month-to-date expenses',
        value: formatCurrency(mtdExpenses, currency),
        change: '',
        changeLabel: 'this month',
        trend: mtdExpenses > 0 ? 'up' : 'flat',
        tone: 'neutral',
        description: 'Total expenses for current month.',
      },
      {
        id: 'net-cashflow',
        label: 'Net cash flow',
        value: formatCurrency(netCashFlow, currency),
        change: '',
        changeLabel: 'income minus expenses',
        trend: netCashFlow > 0 ? 'up' : netCashFlow < 0 ? 'down' : 'flat',
        tone: netCashFlow >= 0 ? 'positive' : 'critical',
        description: 'Net movement this month.',
      },
    ],
  };
};

const resolveTransactionsListStatusOverview: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Fetch all transaction headers
  const headers = await transactionHeaderRepo.findAll();
  const allHeaders = (headers?.data || []) as FinancialTransactionHeader[];

  // Count by status
  const pendingApproval = allHeaders.filter(h => h.status === 'submitted').length;
  const drafts = allHeaders.filter(h => h.status === 'draft').length;
  const approved = allHeaders.filter(h => h.status === 'approved').length;

  return {
    items: [
      {
        id: 'pending-approval',
        label: 'Pending approval',
        value: pendingApproval.toString(),
        change: '',
        changeLabel: 'transactions',
        trend: pendingApproval > 0 ? 'up' : 'flat',
        tone: pendingApproval > 0 ? 'warning' : 'neutral',
        description: 'Awaiting review and approval.',
      },
      {
        id: 'draft',
        label: 'Drafts',
        value: drafts.toString(),
        change: '',
        changeLabel: 'transactions',
        trend: 'flat',
        tone: 'neutral',
        description: 'Saved but not submitted.',
      },
      {
        id: 'approved',
        label: 'Ready to post',
        value: approved.toString(),
        change: '',
        changeLabel: 'transactions',
        trend: approved > 0 ? 'up' : 'flat',
        tone: approved > 0 ? 'informative' : 'neutral',
        description: 'Approved and ready to post.',
      },
    ],
  };
};

const resolveTransactionsListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency and timezone (cached)
  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  // Fetch all transaction headers
  const headers = await transactionHeaderRepo.findAll();
  const allHeaders = (headers?.data || []) as FinancialTransactionHeader[];

  // Build table rows
  const rows = await Promise.all(
    allHeaders.map(async (header) => {
      // Get line items to calculate total and determine type
      const entries = await transactionHeaderRepo.getTransactionEntries(header.id);

      let totalAmount = 0;
      let transactionType: 'income' | 'expense' | 'mixed' = 'income';
      let categoryName = '';
      let sourceName = '';

      // Analyze entries to determine type and total
      const incomeEntries = entries.filter((e: any) => e.type === 'income');
      const expenseEntries = entries.filter((e: any) => e.type === 'expense');

      if (incomeEntries.length > 0 && expenseEntries.length === 0) {
        transactionType = 'income';
        // Total is the sum of credits (or amount) for income
        totalAmount = incomeEntries.reduce((sum: number, e: any) => sum + (e.credit  || 0), 0);
        categoryName = incomeEntries[0]?.category?.name || '';
        sourceName = incomeEntries[0]?.source?.name || header.source?.name || '';
      } else if (expenseEntries.length > 0 && incomeEntries.length === 0) {
        transactionType = 'expense';
        // Total is the sum of debits (or amount) for expense
        totalAmount = expenseEntries.reduce((sum: number, e: any) => sum + (e.debit  || 0), 0);
        categoryName = expenseEntries[0]?.category?.name || '';
        sourceName = expenseEntries[0]?.source?.name || header.source?.name || '';
      } else {
        transactionType = 'mixed';
        // For mixed, show net amount - use amount as fallback
        const totalDebits = entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
        const totalCredits = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);
        totalAmount = Math.max(totalDebits, totalCredits) / 2; // Double-entry amount
      }

      // Status badge variants
      const statusVariants: Record<TransactionStatus, string> = {
        draft: 'neutral',
        submitted: 'warning',
        approved: 'informative',
        posted: 'success',
        voided: 'critical',
      };

      return {
        id: header.id,
        date: formatDate(new Date(header.transaction_date), timezone),
        transactionNumber: header.transaction_number,
        description: header.description || 'No description',
        category: categoryName || '—',
        source: sourceName || '—',
        amount: formatCurrency(totalAmount, currency),
        type: transactionType.charAt(0).toUpperCase() + transactionType.slice(1),
        typeBadgeVariant: transactionType === 'income' ? 'success' : transactionType === 'expense' ? 'warning' : 'neutral',
        status: header.status.charAt(0).toUpperCase() + header.status.slice(1),
        statusVariant: statusVariants[header.status] || 'neutral',
      };
    })
  );

  const columns = [
    { field: 'date', headerName: 'Date', type: 'text', flex: 0.8 },
    { field: 'transactionNumber', headerName: 'Transaction #', type: 'text', flex: 0.8, hideOnMobile: true },
    { field: 'description', headerName: 'Description', type: 'text', flex: 1.5 },
    { field: 'category', headerName: 'Category', type: 'text', flex: 1, hideOnMobile: true },
    { field: 'source', headerName: 'Source', type: 'text', flex: 0.8, hideOnMobile: true },
    { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
    { field: 'type', headerName: 'Type', type: 'badge', badgeVariantField: 'typeBadgeVariant', flex: 0.6, hideOnMobile: true },
    { field: 'status', headerName: 'Status', type: 'badge', badgeVariantField: 'statusVariant', flex: 0.6 },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'view-record',
          label: 'View',
          intent: 'view',
          urlTemplate: '/admin/finance/transactions/{{id}}',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/transactions/entry?transactionId={{id}}',
          variant: 'secondary',
          // Only show edit for draft/submitted transactions
          condition: '{{status}} === "Draft" || {{status}} === "Submitted"',
        },
        {
          id: 'approve-record',
          label: 'Approve',
          intent: 'action',
          handler: 'admin-finance.transactions.approve',
          confirmTitle: 'Approve transaction',
          confirmDescription: 'Approve transaction {{transactionNumber}} for posting?',
          confirmLabel: 'Approve',
          cancelLabel: 'Cancel',
          successMessage: 'Transaction approved.',
          variant: 'secondary',
          // Only show approve for submitted transactions
          condition: '{{status}} === "Submitted"',
        },
        {
          id: 'post-record',
          label: 'Post',
          intent: 'action',
          handler: 'admin-finance.transactions.post',
          confirmTitle: 'Post transaction',
          confirmDescription: 'Post transaction {{transactionNumber}}? This action is final.',
          confirmLabel: 'Post',
          cancelLabel: 'Cancel',
          successMessage: 'Transaction posted.',
          variant: 'primary',
          // Only show post for approved transactions
          condition: '{{status}} === "Approved"',
        },
        {
          id: 'void-record',
          label: 'Void',
          intent: 'action',
          handler: 'admin-finance.transactions.void',
          confirmTitle: 'Void transaction',
          confirmDescription: 'Void transaction {{transactionNumber}}? This cannot be undone.',
          confirmLabel: 'Void',
          cancelLabel: 'Cancel',
          successMessage: 'Transaction voided.',
          variant: 'destructive',
          // Can void any non-voided transaction
          condition: '{{status}} !== "Voided"',
        },
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search transactions...',
    },
    {
      id: 'type',
      type: 'select',
      placeholder: 'Transaction type',
      options: [
        { label: 'All types', value: 'all' },
        { label: 'Income', value: 'income' },
        { label: 'Expense', value: 'expense' },
      ],
    },
    {
      id: 'status',
      type: 'select',
      placeholder: 'Status',
      options: [
        { label: 'All statuses', value: 'all' },
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Approved', value: 'approved' },
        { label: 'Posted', value: 'posted' },
        { label: 'Voided', value: 'voided' },
      ],
    },
  ];

  return {
    rows,
    columns,
    filters,
  };
};

// ==================== ENTRY PAGE HANDLERS ====================

const resolveTransactionEntryHeader: ServiceDataSourceHandler = async (request) => {
  const transactionId = request.params?.transactionId as string;
  const transactionType = request.params?.type as string;

  if (!transactionId) {
    return {
      eyebrow: 'Record transaction',
      headline: transactionType === 'expense' ? 'Record expense' : 'Record income',
      description: transactionType === 'expense'
        ? 'Enter details for outgoing payments and costs.'
        : 'Enter details for incoming funds and donations.',
    };
  }

  return {
    eyebrow: 'Edit transaction',
    headline: 'Update transaction details',
    description: 'Modify the transaction information.',
  };
};

const resolveTransactionEntryTypeSelector: ServiceDataSourceHandler = async (request) => {
  const transactionType = request.params?.type as string;

  return {
    fields: [
      {
        name: 'transactionType',
        label: 'Transaction type',
        type: 'radio',
        options: [
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
        ],
      },
    ],
    values: {
      transactionType: transactionType || 'income',
    },
  };
};

const resolveTransactionEntryHeaderForm: ServiceDataSourceHandler = async (_request) => {
  return {
    fields: [
      {
        name: 'transactionDate',
        label: 'Transaction date',
        type: 'date',
        colSpan: 'half',
        required: true,
      },
      {
        name: 'reference',
        label: 'Reference',
        type: 'text',
        colSpan: 'half',
        placeholder: 'Check #, invoice #, etc.',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        colSpan: 'full',
        placeholder: 'Describe this transaction...',
        required: true,
        rows: 2,
      },
    ],
    values: {
      transactionDate: new Date().toISOString().split('T')[0],
      reference: '',
      description: '',
    },
    validation: {
      transactionDate: { required: true },
      description: { required: true },
    },
  };
};

const resolveTransactionEntryLineItems: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const fundRepository = container.get<IFundRepository>(TYPES.IFundRepository);
  const financialSourceRepository = container.get<IFinancialSourceRepository>(TYPES.IFinancialSourceRepository);
  const accountRepository = container.get<IAccountRepository>(TYPES.IAccountRepository);
  const budgetRepository = container.get<IBudgetRepository>(TYPES.IBudgetRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Determine transaction type from request params
  const transactionType = (request.params?.type as string) || 'income';

  // Fetch dropdown options from repositories (RLS handles tenant isolation)
  const [categoriesResult, fundsResult, sourcesResult, accountsResult, budgetsResult] = await Promise.all([
    categoryRepository.findAll(),
    fundRepository.findAll(),
    financialSourceRepository.findAll(),
    accountRepository.findAll(),
    budgetRepository.findAll(),
  ]);

  // Extract data arrays from query results
  const categories = categoriesResult?.data || [];
  const funds = fundsResult?.data || [];
  const sources = sourcesResult?.data || [];
  const accounts = accountsResult?.data || [];
  const budgets = budgetsResult?.data || [];

  // Filter to only transaction-related categories (income_transaction or expense_transaction)
  // Include the type so client can filter dynamically when user toggles transaction type
  const transactionCategories = categories.filter((category) => {
    const categoryType = (category as { type?: string }).type;
    return categoryType === 'income_transaction' || categoryType === 'expense_transaction';
  });

  // Transform to dropdown options - include type for client-side filtering
  const categoryOptions = transactionCategories.map((category) => ({
    value: category.id,
    label: category.name,
    code: (category as { code?: string }).code || '',
    description: (category as { description?: string }).description || '',
    type: (category as { type?: string }).type || '', // Include type for filtering
  }));

  const fundOptions = funds.map((fund) => ({
    value: fund.id,
    label: fund.name,
    code: (fund as { code?: string }).code || '',
  }));

  const sourceOptions = sources.map((source) => ({
    value: source.id,
    label: source.name,
    code: (source as { code?: string }).code || '',
  }));

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
    code: (account as { accountNumber?: string }).accountNumber || '',
  }));

  // Transform budgets to dropdown options (for expense transactions)
  const budgetOptions = budgets.map((budget) => ({
    value: budget.id,
    label: budget.name,
    code: (budget as { code?: string }).code || '',
    description: (budget as { description?: string }).description || '',
  }));

  return {
    lines: [],
    columns: [
      { field: 'category', headerName: 'Category', flex: 1, type: 'select', required: true },
      { field: 'fund', headerName: 'Fund', flex: 0.8, type: 'select' },
      { field: 'source', headerName: 'Source', flex: 0.8, type: 'select' },
      { field: 'amount', headerName: 'Amount', flex: 0.6, type: 'currency', required: true },
      { field: 'description', headerName: 'Description', flex: 1, type: 'text' },
    ],
    categoryOptions,
    fundOptions,
    sourceOptions,
    accountOptions,
    budgetOptions,
    currency,
    transactionType,
    totalAmount: formatCurrency(0, currency),
  };
};

const resolveTransactionEntrySummary: ServiceDataSourceHandler = async (_request) => {
  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  return {
    fields: [
      {
        name: 'totalAmount',
        label: 'Total amount',
        type: 'display',
        colSpan: 'full',
      },
    ],
    values: {
      totalAmount: formatCurrency(0, currency),
    },
  };
};

// ==================== PROFILE PAGE HANDLERS ====================

/**
 * Helper to get status badge variant
 */
function getStatusBadgeVariant(status: TransactionStatus): string {
  switch (status) {
    case 'draft': return 'secondary';
    case 'submitted': return 'warning';
    case 'approved': return 'info';
    case 'posted': return 'success';
    case 'voided': return 'destructive';
    default: return 'secondary';
  }
}

/**
 * Helper to get type badge variant
 */
function getTypeBadgeVariant(type: TransactionType): string {
  switch (type) {
    case 'income': return 'positive';
    case 'expense': return 'negative';
    case 'transfer': return 'info';
    case 'adjustment': return 'secondary';
    default: return 'secondary';
  }
}

const resolveTransactionProfileHeader: ServiceDataSourceHandler = async (request) => {
  const transactionId = request.params?.transactionId as string;

  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }

  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  // Get tenant currency and timezone (cached)
  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  // Fetch the transaction header
  const header = await transactionHeaderRepo.findById(transactionId);

  if (!header) {
    return {
      eyebrow: 'Transaction not found',
      title: 'Error',
      subtitle: 'The requested transaction could not be found',
      badge: { label: 'Error', variant: 'destructive' },
      metrics: [],
      actions: [],
    };
  }

  // Get transaction entries for total amount
  const entries = await transactionHeaderRepo.getTransactionEntries(transactionId);
  // Calculate total - use amount if debit/credit are 0, divide by 2 for double-entry
  const totalAmount = entries.reduce((sum: number, e: any) => {
    const entryAmount = e.debit || e.credit  || 0;
    return sum + entryAmount;
  }, 0) / 2; // Divide by 2 for double-entry (each transaction has debit + credit entry)

  // Build actions based on status
  const actions: any[] = [];
  if (header.status === 'submitted') {
    actions.push({
      label: 'Approve',
      variant: 'primary',
      handler: 'admin-finance.transactions.approve',
    });
  }
  if (header.status === 'approved') {
    actions.push({
      label: 'Post',
      variant: 'primary',
      handler: 'admin-finance.transactions.post',
    });
  }
  if (header.status !== 'voided' && header.status !== 'draft') {
    actions.push({
      label: 'Void',
      variant: 'destructive',
      handler: 'admin-finance.transactions.void',
    });
  }

  return {
    eyebrow: header.transaction_number || transactionId.substring(0, 8),
    title: header.description || 'Transaction details',
    subtitle: `${(header.transaction_type || 'income').charAt(0).toUpperCase()}${(header.transaction_type || 'income').slice(1)} transaction`,
    badge: {
      label: (header.status || 'draft').charAt(0).toUpperCase() + (header.status || 'draft').slice(1),
      variant: getStatusBadgeVariant(header.status as TransactionStatus),
    },
    metrics: [
      {
        label: 'Amount',
        value: formatCurrency(totalAmount, currency),
        caption: 'Total amount',
      },
      {
        label: 'Type',
        value: (header.transaction_type || 'income').charAt(0).toUpperCase() + (header.transaction_type || 'income').slice(1),
        caption: 'Transaction type',
      },
      {
        label: 'Date',
        value: formatDate(header.transaction_date ? new Date(header.transaction_date) : new Date(), timezone),
        caption: 'Transaction date',
      },
    ],
    actions,
  };
};

const resolveTransactionProfileDetails: ServiceDataSourceHandler = async (request) => {
  const transactionId = request.params?.transactionId as string;

  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }

  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );
  const timezone = await getTenantTimezone();

  // Fetch the transaction header
  const header = await transactionHeaderRepo.findById(transactionId);

  if (!header) {
    return {
      panels: [
        {
          id: 'error',
          title: 'Transaction not found',
          description: 'The requested transaction could not be found',
          columns: 1,
          items: [],
        },
      ],
    };
  }

  const transactionDate = header.transaction_date
    ? formatDate(new Date(header.transaction_date), timezone)
    : '—';

  return {
    panels: [
      {
        id: 'transaction-info',
        title: 'Transaction information',
        description: 'Basic transaction details',
        columns: 2,
        items: [
          { label: 'Transaction #', value: header.transaction_number || '—', type: 'text' },
          { label: 'Date', value: transactionDate, type: 'text' },
          {
            label: 'Type',
            value: (header.transaction_type || 'income').charAt(0).toUpperCase() + (header.transaction_type || 'income').slice(1),
            type: 'badge',
            badgeVariant: getTypeBadgeVariant(header.transaction_type as TransactionType),
          },
          {
            label: 'Status',
            value: (header.status || 'draft').charAt(0).toUpperCase() + (header.status || 'draft').slice(1),
            type: 'badge',
            badgeVariant: getStatusBadgeVariant(header.status as TransactionStatus),
          },
          { label: 'Description', value: header.description || '—', type: 'multiline' },
        ],
      },
    ],
  };
};

const resolveTransactionProfileLineItems: ServiceDataSourceHandler = async (request) => {
  const transactionId = request.params?.transactionId as string;
  const currency = await getTenantCurrency();

  if (!transactionId) {
    return {
      rows: [],
      columns: [
        { field: 'category', headerName: 'Category', type: 'text', flex: 1 },
        { field: 'fund', headerName: 'Fund', type: 'text', flex: 0.8 },
        { field: 'source', headerName: 'Source', type: 'text', flex: 0.8 },
        { field: 'amount', headerName: 'Amount', type: 'text', flex: 0.6, align: 'right' },
        { field: 'description', headerName: 'Description', type: 'text', flex: 1 },
      ],
    };
  }

  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  // Get line items (financial_transactions linked to this header)
  const lineItems = await transactionHeaderRepo.getLineItems(transactionId);

  const rows = (lineItems || []).map((item: any, index: number) => {
    // Calculate amount from debit/credit
    const itemAmount = item.debit || item.credit || 0;
    const formattedAmount = formatCurrency(itemAmount, currency);
    return {
      id: item.id || `line-${index}`,
      category: item.category?.name || item.category_name || '—',
      fund: item.fund?.name || item.fund_name || '—',
      source: item.source?.name || item.source_name || '—',
      amount: formattedAmount,
      description: item.description || '—',
    };
  });

  return {
    rows,
    columns: [
      { field: 'category', headerName: 'Category', type: 'text', flex: 1 },
      { field: 'fund', headerName: 'Fund', type: 'text', flex: 0.8 },
      { field: 'source', headerName: 'Source', type: 'text', flex: 0.8 },
      { field: 'amount', headerName: 'Amount', type: 'text', flex: 0.6, align: 'right' },
      { field: 'description', headerName: 'Description', type: 'text', flex: 1 },
    ],
  };
};

const resolveTransactionProfileJournalEntries: ServiceDataSourceHandler = async (request) => {
  const transactionId = request.params?.transactionId as string;
  const currency = await getTenantCurrency();

  if (!transactionId) {
    return {
      rows: [],
      columns: [
        { field: 'account', headerName: 'Account', type: 'text', flex: 1 },
        { field: 'debit', headerName: 'Debit', type: 'text', flex: 0.6, align: 'right' },
        { field: 'credit', headerName: 'Credit', type: 'text', flex: 0.6, align: 'right' },
      ],
    };
  }

  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  // Get journal entries (transaction_entries)
  const entries = await transactionHeaderRepo.getTransactionEntries(transactionId);

  const rows = (entries || []).map((entry: any, index: number) => {
    // Get debit/credit from columns
    const debitValue = entry.debit || 0;
    const creditValue = entry.credit || 0;

    return {
      id: entry.id || `entry-${index}`,
      account: entry.account?.name || entry.account_name || `Account ${entry.account_id?.substring(0, 8) || index}`,
      debit: debitValue ? formatCurrency(debitValue, currency) : '—',
      credit: creditValue ? formatCurrency(creditValue, currency) : '—',
    };
  });

  return {
    rows,
    columns: [
      { field: 'account', headerName: 'Account', type: 'text', flex: 1 },
      { field: 'debit', headerName: 'Debit', type: 'text', flex: 0.6, align: 'right' },
      { field: 'credit', headerName: 'Credit', type: 'text', flex: 0.6, align: 'right' },
    ],
  };
};

const resolveTransactionProfileApprovalHistory: ServiceDataSourceHandler = async (request) => {
  const transactionId = request.params?.transactionId as string;
  const timezone = await getTenantTimezone();

  if (!transactionId) {
    return {
      items: [
        {
          id: 'empty-state',
          title: 'No approval history',
          date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
          timeAgo: 'Today',
          description: 'Approval events will appear here.',
          category: 'Info',
          status: 'new',
        },
      ],
    };
  }

  const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  // Fetch the transaction header to get approval info
  const header = await transactionHeaderRepo.findById(transactionId);

  if (!header) {
    return {
      items: [
        {
          id: 'error',
          title: 'Transaction not found',
          date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
          timeAgo: 'Today',
          description: 'The requested transaction could not be found.',
          category: 'Error',
          status: 'error',
        },
      ],
    };
  }

  const items: any[] = [];

  // Created event
  if (header.created_at) {
    const createdDate = new Date(header.created_at);
    items.push({
      id: 'created',
      title: 'Transaction created',
      date: formatDate(createdDate, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(createdDate),
      description: `Transaction ${header.transaction_number || ''} was created.`,
      category: 'Created',
      status: 'completed',
    });
  }

  // Submitted event
  if (header.submitted_at) {
    const submittedDate = new Date(header.submitted_at);
    items.push({
      id: 'submitted',
      title: 'Submitted for approval',
      date: formatDate(submittedDate, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(submittedDate),
      description: 'Transaction was submitted for approval.',
      category: 'Submitted',
      status: 'completed',
    });
  }

  // Approved event
  if (header.approved_at) {
    const approvedDate = new Date(header.approved_at);
    items.push({
      id: 'approved',
      title: 'Approved',
      date: formatDate(approvedDate, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(approvedDate),
      description: `Transaction was approved${header.approved_by ? ' by an auditor' : ''}.`,
      category: 'Approved',
      status: 'completed',
    });
  }

  // Posted event
  if (header.posted_at) {
    const postedDate = new Date(header.posted_at);
    items.push({
      id: 'posted',
      title: 'Posted to ledger',
      date: formatDate(postedDate, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(postedDate),
      description: 'Transaction was posted to the general ledger.',
      category: 'Posted',
      status: 'completed',
    });
  }

  // Voided event
  if (header.voided_at) {
    const voidedDate = new Date(header.voided_at);
    items.push({
      id: 'voided',
      title: 'Voided',
      date: formatDate(voidedDate, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(voidedDate),
      description: header.void_reason ? `Reason: ${header.void_reason}` : 'Transaction was voided.',
      category: 'Voided',
      status: 'error',
    });
  }

  // If no history items, show empty state
  if (items.length === 0) {
    return {
      items: [
        {
          id: 'empty-state',
          title: 'No approval history',
          date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
          timeAgo: 'Today',
          description: 'Approval events will appear here.',
          category: 'Info',
          status: 'new',
        },
      ],
    };
  }

  // Sort by date descending (most recent first)
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { items };
};

/**
 * Helper to get relative time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ==================== ACTION HANDLERS ====================

/**
 * Line item structure from the form
 */
interface LineItemInput {
  categoryId?: string;
  fundId?: string;
  sourceId?: string;
  budgetId?: string;
  amount?: number | string;
  description?: string;
}

/**
 * Helper function to create journal entries from line items
 * For income: Debit cash account, Credit revenue account
 * For expense: Debit expense account, Credit cash account
 */
async function createJournalEntries(
  lineItems: LineItemInput[],
  transactionType: 'income' | 'expense',
  transactionDate: string,
  categoryRepository: ICategoryRepository,
  chartOfAccountRepository: IChartOfAccountRepository
): Promise<any[]> {
  const journalEntries: any[] = [];

  // Get the default cash account (typically account code starting with "1" for assets)
  // In a real implementation, this would be configurable per tenant
  const cashAccounts = await chartOfAccountRepository.findAll();
  const cashAccountsData = cashAccounts?.data || [];
  const cashAccount = cashAccountsData.find(
    (acc: any) => acc.account_type === 'asset' && acc.code?.startsWith('1')
  );

  for (const lineItem of lineItems) {
    if (!lineItem.categoryId || !lineItem.amount) {
      continue;
    }

    const amount = typeof lineItem.amount === 'string'
      ? parseFloat(lineItem.amount)
      : lineItem.amount;

    if (isNaN(amount) || amount <= 0) {
      continue;
    }

    // Get the category to find the linked GL account
    const category = await categoryRepository.findById(lineItem.categoryId);
    const linkedAccountId = (category as any)?.coa_id || null;

    if (transactionType === 'income') {
      // Income: Debit Cash, Credit Revenue
      // Debit entry (Cash increases)
      journalEntries.push({
        type: 'income' as TransactionType,
        description: lineItem.description || '',
        date: transactionDate,
        debit: amount,
        credit: 0,
        coa_id: cashAccount?.id || null,
        category_id: lineItem.categoryId,
        fund_id: lineItem.fundId || null,
        source_id: lineItem.sourceId || null,
        budget_id: null, // Income transactions don't track budgets
      });
      // Credit entry (Revenue increases)
      journalEntries.push({
        type: 'income' as TransactionType,
        description: lineItem.description || '',
        date: transactionDate,
        debit: 0,
        credit: amount,
        coa_id: linkedAccountId,
        category_id: lineItem.categoryId,
        fund_id: lineItem.fundId || null,
        source_id: lineItem.sourceId || null,
        budget_id: null, // Income transactions don't track budgets
      });
    } else {
      // Expense: Debit Expense, Credit Cash
      // Debit entry (Expense increases)
      journalEntries.push({
        type: 'expense' as TransactionType,
        description: lineItem.description || '',
        date: transactionDate,
        debit: amount,
        credit: 0,
        coa_id: linkedAccountId,
        category_id: lineItem.categoryId,
        fund_id: lineItem.fundId || null,
        source_id: lineItem.sourceId || null,
        budget_id: lineItem.budgetId || null, // Track budget for expense transactions
      });
      // Credit entry (Cash decreases)
      journalEntries.push({
        type: 'expense' as TransactionType,
        description: lineItem.description || '',
        date: transactionDate,
        debit: 0,
        credit: amount,
        coa_id: cashAccount?.id || null,
        category_id: lineItem.categoryId,
        fund_id: lineItem.fundId || null,
        source_id: lineItem.sourceId || null,
        budget_id: lineItem.budgetId || null, // Track budget for expense transactions
      });
    }
  }

  return journalEntries;
}

/**
 * Submit a transaction (creates and submits for approval)
 */
const submitTransaction: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  // Form values may be wrapped in 'values' by AdminFormSubmitHandler
  const values = (params.values ?? params) as Record<string, unknown>;
  const transactionId = (values.transactionId ?? params.transactionId) as string | undefined;

  console.log('[submitTransaction] Processing transaction. ID:', transactionId, 'Values:', JSON.stringify(values).substring(0, 500));

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
      TYPES.IFinancialTransactionHeaderRepository
    );
    const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
    const chartOfAccountRepository = container.get<IChartOfAccountRepository>(
      TYPES.IChartOfAccountRepository
    );

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return {
        success: false,
        message: 'No tenant context available',
      };
    }

    // Extract form data
    const transactionType = (values.transactionType as 'income' | 'expense') || 'income';
    const transactionDate = (values.transactionDate as string) || new Date().toISOString().split('T')[0];
    const description = (values.description as string) || '';
    const reference = (values.reference as string) || null;
    const lineItems = (values.lineItems as LineItemInput[]) || [];

    // Validate line items
    if (!lineItems || lineItems.length === 0) {
      return {
        success: false,
        message: 'At least one line item is required',
      };
    }

    // Create journal entries from line items
    const journalEntries = await createJournalEntries(
      lineItems,
      transactionType,
      transactionDate,
      categoryRepository,
      chartOfAccountRepository
    );

    if (journalEntries.length === 0) {
      return {
        success: false,
        message: 'No valid line items provided',
      };
    }

    // Prepare header data
    const headerData: Partial<FinancialTransactionHeader> = {
      transaction_date: transactionDate,
      description,
      reference,
      status: 'draft' as TransactionStatus, // Start as draft, then submit
    };

    let header: FinancialTransactionHeader;

    if (transactionId) {
      // Update existing transaction
      const result = await transactionHeaderRepo.updateWithTransactions(
        transactionId,
        headerData,
        journalEntries
      );
      header = result.header;
    } else {
      // Create new transaction
      const result = await transactionHeaderRepo.createWithTransactions(
        headerData,
        journalEntries
      );
      header = result.header;
    }

    // Submit the transaction for approval
    await transactionHeaderRepo.submitTransaction(header.id);

    console.log('[submitTransaction] Transaction submitted:', header.id);

    // Get the updated header with transaction number
    const submittedHeader = await transactionHeaderRepo.findById(header.id);

    // Calculate total amount for notification
    const totalAmount = lineItems.reduce((sum, item) => {
      const amt = typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    // Send notification to approvers (async, don't wait)
    notifyTransactionSubmitted({
      transactionId: header.id,
      transactionNumber: submittedHeader?.transaction_number || header.id,
      amount: formatCurrency(totalAmount, await getTenantCurrency()),
      description: description || 'No description',
      creatorId: submittedHeader?.created_by || '',
      tenantId: tenant.id,
    }).catch(err => console.error('[submitTransaction] Notification error:', err));

    return {
      success: true,
      message: 'Transaction submitted successfully',
      transactionId: header.id,
      redirectUrl: '/admin/finance/transactions',
      toast: {
        type: 'success',
        title: 'Transaction submitted',
        description: 'Your transaction has been submitted for approval.',
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit transaction';
    console.error('[submitTransaction] Failed:', error);

    return {
      success: false,
      message: errorMessage,
      toast: {
        type: 'error',
        title: 'Submission failed',
        description: errorMessage,
      },
    };
  }
};

/**
 * Save a transaction as draft (does not submit for approval)
 */
const saveDraftTransaction: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;
  const transactionId = (values.transactionId ?? params.transactionId) as string | undefined;

  console.log('[saveDraftTransaction] Saving draft. ID:', transactionId);

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
      TYPES.IFinancialTransactionHeaderRepository
    );
    const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
    const chartOfAccountRepository = container.get<IChartOfAccountRepository>(
      TYPES.IChartOfAccountRepository
    );

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return {
        success: false,
        message: 'No tenant context available',
      };
    }

    // Extract form data
    const transactionType = (values.transactionType as 'income' | 'expense') || 'income';
    const transactionDate = (values.transactionDate as string) || new Date().toISOString().split('T')[0];
    const description = (values.description as string) || '';
    const reference = (values.reference as string) || null;
    const lineItems = (values.lineItems as LineItemInput[]) || [];

    // Create journal entries from line items (if any)
    const journalEntries = await createJournalEntries(
      lineItems,
      transactionType,
      transactionDate,
      categoryRepository,
      chartOfAccountRepository
    );

    // Prepare header data - keep as draft
    const headerData: Partial<FinancialTransactionHeader> = {
      transaction_date: transactionDate,
      description,
      reference,
      status: 'draft' as TransactionStatus,
    };

    let header: FinancialTransactionHeader;

    if (transactionId) {
      // Update existing draft
      const result = await transactionHeaderRepo.updateWithTransactions(
        transactionId,
        headerData,
        journalEntries
      );
      header = result.header;
    } else {
      // Create new draft
      const result = await transactionHeaderRepo.createWithTransactions(
        headerData,
        journalEntries
      );
      header = result.header;
    }

    console.log('[saveDraftTransaction] Draft saved:', header.id);

    return {
      success: true,
      message: 'Draft saved successfully',
      transactionId: header.id,
      redirectUrl: '/admin/finance/transactions',
      toast: {
        type: 'success',
        title: 'Draft saved',
        description: 'Your transaction has been saved as a draft.',
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save draft';
    console.error('[saveDraftTransaction] Failed:', error);

    return {
      success: false,
      message: errorMessage,
      toast: {
        type: 'error',
        title: 'Save failed',
        description: errorMessage,
      },
    };
  }
};

/**
 * Approve a submitted transaction (CHECKER role - Auditor)
 * Implements Maker-Checker workflow: The user who created/submitted the transaction cannot approve it
 */
const approveTransaction: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const transactionId = (params.transactionId ?? params.id) as string;

  console.log('[approveTransaction] Approving transaction:', transactionId);

  if (!transactionId) {
    return {
      success: false,
      message: 'Transaction ID is required',
    };
  }

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
      TYPES.IFinancialTransactionHeaderRepository
    );

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return {
        success: false,
        message: 'No tenant context available',
      };
    }

    // Get current user for Maker-Checker validation
    const currentUserId = await getCurrentUserId({ optional: true });
    if (!currentUserId) {
      return {
        success: false,
        message: 'Authentication required to approve transactions',
      };
    }

    // Get the transaction to verify status and check Maker-Checker
    const header = await transactionHeaderRepo.findById(transactionId);
    if (!header) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }

    if (header.status !== 'submitted') {
      return {
        success: false,
        message: `Cannot approve transaction in ${header.status} status. Transaction must be submitted first.`,
      };
    }

    // MAKER-CHECKER ENFORCEMENT: Creator cannot approve their own transaction
    // This ensures separation of duties - one person creates (Treasurer), another approves (Auditor)
    if (header.created_by === currentUserId) {
      console.log('[approveTransaction] Maker-Checker violation: Creator attempting to approve own transaction');
      return {
        success: false,
        message: 'You cannot approve your own transaction. The Maker-Checker policy requires a different user (Auditor) to approve transactions.',
      };
    }

    // Approve the transaction
    await transactionHeaderRepo.approveTransaction(transactionId);

    console.log('[approveTransaction] Transaction approved:', transactionId);

    // Get transaction entries for amount calculation
    const entries = await transactionHeaderRepo.getTransactionEntries(transactionId);
    const totalAmount = entries.reduce((sum: number, e: any) => sum + (e.debit || e.credit  || 0), 0) / 2;

    // Send notification to creator (async, don't wait)
    notifyTransactionApproved(
      {
        transactionId,
        transactionNumber: header.transaction_number || transactionId,
        amount: formatCurrency(totalAmount, await getTenantCurrency()),
        description: header.description || 'Transaction',
        creatorId: header.created_by || '',
        tenantId: tenant.id,
      },
      currentUserId
    ).catch(err => console.error('[approveTransaction] Notification error:', err));

    return {
      success: true,
      message: 'Transaction approved successfully',
      toast: {
        type: 'success',
        title: 'Transaction approved',
        description: `Transaction ${header.transaction_number || ''} has been approved.`,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to approve transaction';
    console.error('[approveTransaction] Failed:', error);

    return {
      success: false,
      message: errorMessage,
      toast: {
        type: 'error',
        title: 'Approval failed',
        description: errorMessage,
      },
    };
  }
};

/**
 * Post an approved transaction (makes it final and affects balances)
 */
const postTransaction: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const transactionId = (params.transactionId ?? params.id) as string;

  console.log('[postTransaction] Posting transaction:', transactionId);

  if (!transactionId) {
    return {
      success: false,
      message: 'Transaction ID is required',
    };
  }

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
      TYPES.IFinancialTransactionHeaderRepository
    );

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return {
        success: false,
        message: 'No tenant context available',
      };
    }

    // Get the transaction to verify status
    const header = await transactionHeaderRepo.findById(transactionId);
    if (!header) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }

    if (header.status !== 'approved') {
      return {
        success: false,
        message: `Cannot post transaction in ${header.status} status. Transaction must be approved first.`,
      };
    }

    // Verify the transaction is balanced before posting
    const isBalanced = await transactionHeaderRepo.isTransactionBalanced(transactionId);
    if (!isBalanced) {
      return {
        success: false,
        message: 'Transaction is not balanced. Total debits must equal total credits.',
      };
    }

    // Post the transaction
    await transactionHeaderRepo.postTransaction(transactionId);

    console.log('[postTransaction] Transaction posted:', transactionId);

    // Get current user for notification
    const currentUserId = await getCurrentUserId({ optional: true });

    // Get transaction entries for amount calculation
    const entries = await transactionHeaderRepo.getTransactionEntries(transactionId);
    const totalAmount = entries.reduce((sum: number, e: any) => sum + (e.debit || e.credit  || 0), 0) / 2;

    // Send notification to creator (async, don't wait)
    notifyTransactionPosted(
      {
        transactionId,
        transactionNumber: header.transaction_number || transactionId,
        amount: formatCurrency(totalAmount, await getTenantCurrency()),
        description: header.description || 'Transaction',
        creatorId: header.created_by || '',
        tenantId: tenant.id,
      },
      currentUserId || ''
    ).catch(err => console.error('[postTransaction] Notification error:', err));

    return {
      success: true,
      message: 'Transaction posted successfully',
      toast: {
        type: 'success',
        title: 'Transaction posted',
        description: `Transaction ${header.transaction_number || ''} has been posted to the ledger.`,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to post transaction';
    console.error('[postTransaction] Failed:', error);

    return {
      success: false,
      message: errorMessage,
      toast: {
        type: 'error',
        title: 'Posting failed',
        description: errorMessage,
      },
    };
  }
};

/**
 * Void a transaction (creates reversal entries)
 */
const voidTransaction: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const transactionId = (params.transactionId ?? params.id) as string;
  const voidReason = (params.voidReason ?? params.reason) as string;

  console.log('[voidTransaction] Voiding transaction:', transactionId);

  if (!transactionId) {
    return {
      success: false,
      message: 'Transaction ID is required',
    };
  }

  if (!voidReason || voidReason.trim() === '') {
    return {
      success: false,
      message: 'Void reason is required',
    };
  }

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const transactionHeaderRepo = container.get<IFinancialTransactionHeaderRepository>(
      TYPES.IFinancialTransactionHeaderRepository
    );

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return {
        success: false,
        message: 'No tenant context available',
      };
    }

    // Get the transaction to verify it can be voided
    const header = await transactionHeaderRepo.findById(transactionId);
    if (!header) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }

    if (header.status === 'voided') {
      return {
        success: false,
        message: 'Transaction is already voided',
      };
    }

    // Void the transaction
    await transactionHeaderRepo.voidTransaction(transactionId, voidReason.trim());

    console.log('[voidTransaction] Transaction voided:', transactionId);

    // Get current user for notification
    const currentUserId = await getCurrentUserId({ optional: true });

    // Get transaction entries for amount calculation
    const entries = await transactionHeaderRepo.getTransactionEntries(transactionId);
    const totalAmount = entries.reduce((sum: number, e: any) => sum + (e.debit || e.credit  || 0), 0) / 2;

    // Send notification to creator and admins (async, don't wait)
    notifyTransactionVoided(
      {
        transactionId,
        transactionNumber: header.transaction_number || transactionId,
        amount: formatCurrency(totalAmount, await getTenantCurrency()),
        description: header.description || 'Transaction',
        creatorId: header.created_by || '',
        tenantId: tenant.id,
      },
      voidReason.trim(),
      currentUserId || ''
    ).catch(err => console.error('[voidTransaction] Notification error:', err));

    return {
      success: true,
      message: 'Transaction voided successfully',
      toast: {
        type: 'warning',
        title: 'Transaction voided',
        description: `Transaction ${header.transaction_number || ''} has been voided.`,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to void transaction';
    console.error('[voidTransaction] Failed:', error);

    return {
      success: false,
      message: errorMessage,
      toast: {
        type: 'error',
        title: 'Void failed',
        description: errorMessage,
      },
    };
  }
};

// Export all handlers
export const adminFinanceTransactionsHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-finance.transactions.list.hero': resolveTransactionsListHero,
  'admin-finance.transactions.list.summary': resolveTransactionsListSummary,
  'admin-finance.transactions.list.statusOverview': resolveTransactionsListStatusOverview,
  'admin-finance.transactions.list.table': resolveTransactionsListTable,
  // Entry page handlers
  'admin-finance.transactions.entry.header': resolveTransactionEntryHeader,
  'admin-finance.transactions.entry.typeSelector': resolveTransactionEntryTypeSelector,
  'admin-finance.transactions.entry.headerForm': resolveTransactionEntryHeaderForm,
  'admin-finance.transactions.entry.lineItems': resolveTransactionEntryLineItems,
  'admin-finance.transactions.entry.summary': resolveTransactionEntrySummary,
  // Profile page handlers
  'admin-finance.transactions.profile.header': resolveTransactionProfileHeader,
  'admin-finance.transactions.profile.details': resolveTransactionProfileDetails,
  'admin-finance.transactions.profile.lineItems': resolveTransactionProfileLineItems,
  'admin-finance.transactions.profile.journalEntries': resolveTransactionProfileJournalEntries,
  'admin-finance.transactions.profile.approvalHistory': resolveTransactionProfileApprovalHistory,
  // Action handlers
  'admin-finance.transactions.submit': submitTransaction,
  'admin-finance.transactions.saveDraft': saveDraftTransaction,
  'admin-finance.transactions.approve': approveTransaction,
  'admin-finance.transactions.post': postTransaction,
  'admin-finance.transactions.void': voidTransaction,
};
