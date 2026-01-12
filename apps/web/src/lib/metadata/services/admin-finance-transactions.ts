import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';

// ==================== LIST PAGE HANDLERS ====================

const resolveTransactionsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  return {
    eyebrow: 'Financial transactions',
    headline: 'Track all income and expenses',
    description: 'View, filter, and manage your organization\'s financial transactions.',
    metrics: [
      {
        label: 'Total transactions',
        value: '0',
        caption: 'All time',
      },
      {
        label: 'This month income',
        value: formatCurrency(0, currency),
        caption: 'Revenue received',
      },
      {
        label: 'This month expenses',
        value: formatCurrency(0, currency),
        caption: 'Costs incurred',
      },
    ],
  };
};

const resolveTransactionsListSummary: ServiceDataSourceHandler = async (_request) => {
  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  return {
    items: [
      {
        id: 'mtd-income',
        label: 'Month-to-date income',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'this month',
        trend: 'flat',
        tone: 'positive',
        description: 'Total income for current month.',
      },
      {
        id: 'mtd-expenses',
        label: 'Month-to-date expenses',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'this month',
        trend: 'flat',
        tone: 'neutral',
        description: 'Total expenses for current month.',
      },
      {
        id: 'net-cashflow',
        label: 'Net cash flow',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'income minus expenses',
        trend: 'flat',
        tone: 'informative',
        description: 'Net movement this month.',
      },
    ],
  };
};

const resolveTransactionsListStatusOverview: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'pending-approval',
        label: 'Pending approval',
        value: '0',
        change: '',
        changeLabel: 'transactions',
        trend: 'flat',
        tone: 'warning',
        description: 'Awaiting review and approval.',
      },
      {
        id: 'draft',
        label: 'Drafts',
        value: '0',
        change: '',
        changeLabel: 'transactions',
        trend: 'flat',
        tone: 'neutral',
        description: 'Saved but not submitted.',
      },
    ],
  };
};

const resolveTransactionsListTable: ServiceDataSourceHandler = async (_request) => {
  const rows: any[] = [];

  const columns = [
    { field: 'date', headerName: 'Date', type: 'text', flex: 0.8 },
    { field: 'transactionNumber', headerName: 'Transaction #', type: 'text', flex: 0.8 },
    { field: 'description', headerName: 'Description', type: 'text', flex: 1.5 },
    { field: 'category', headerName: 'Category', type: 'text', flex: 1 },
    { field: 'source', headerName: 'Source', type: 'text', flex: 0.8 },
    { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
    { field: 'type', headerName: 'Type', type: 'badge', badgeVariantField: 'typeBadgeVariant', flex: 0.6 },
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

const resolveTransactionEntryLineItems: ServiceDataSourceHandler = async (_request) => {
  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  return {
    lines: [],
    columns: [
      { field: 'category', headerName: 'Category', flex: 1 },
      { field: 'fund', headerName: 'Fund', flex: 0.8 },
      { field: 'source', headerName: 'Source', flex: 0.8 },
      { field: 'amount', headerName: 'Amount', flex: 0.6 },
      { field: 'description', headerName: 'Description', flex: 1 },
    ],
    categoryOptions: [],
    sourceOptions: [],
    fundOptions: [],
    accountOptions: [],
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

const resolveTransactionProfileHeader: ServiceDataSourceHandler = async (request) => {
  const transactionId = request.params?.transactionId as string;

  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }

  // Get tenant currency and timezone (cached)
  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  return {
    eyebrow: 'TXN-000000',
    title: 'Transaction details',
    subtitle: 'Transaction record',
    badge: {
      label: 'Posted',
      variant: 'success',
    },
    metrics: [
      {
        label: 'Amount',
        value: formatCurrency(0, currency),
        caption: 'Total amount',
      },
      {
        label: 'Type',
        value: 'Income',
        caption: 'Transaction type',
      },
      {
        label: 'Date',
        value: formatDate(new Date(), timezone),
        caption: 'Transaction date',
      },
    ],
    actions: [],
  };
};

const resolveTransactionProfileDetails: ServiceDataSourceHandler = async (_request) => {
  return {
    panels: [
      {
        id: 'transaction-info',
        title: 'Transaction information',
        description: 'Basic transaction details',
        columns: 2,
        items: [
          { label: 'Transaction #', value: '—', type: 'text' },
          { label: 'Date', value: '—', type: 'text' },
          { label: 'Type', value: 'Income', type: 'badge', badgeVariant: 'positive' },
          { label: 'Status', value: 'Posted', type: 'badge', badgeVariant: 'success' },
          { label: 'Description', value: '—', type: 'multiline' },
        ],
      },
    ],
  };
};

const resolveTransactionProfileLineItems: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'category', headerName: 'Category', type: 'text', flex: 1 },
      { field: 'fund', headerName: 'Fund', type: 'text', flex: 0.8 },
      { field: 'source', headerName: 'Source', type: 'text', flex: 0.8 },
      { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.6 },
      { field: 'description', headerName: 'Description', type: 'text', flex: 1 },
    ],
  };
};

const resolveTransactionProfileJournalEntries: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'account', headerName: 'Account', type: 'text', flex: 1 },
      { field: 'debit', headerName: 'Debit', type: 'currency', flex: 0.6 },
      { field: 'credit', headerName: 'Credit', type: 'currency', flex: 0.6 },
    ],
  };
};

const resolveTransactionProfileApprovalHistory: ServiceDataSourceHandler = async (_request) => {
  const timezone = await getTenantTimezone();
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
        icon: '📋',
      },
    ],
  };
};

// ==================== ACTION HANDLERS ====================

const submitTransaction: ServiceDataSourceHandler = async (_request) => {
  return {
    success: false,
    message: 'Transaction submission not yet implemented',
  };
};

const saveDraftTransaction: ServiceDataSourceHandler = async (_request) => {
  return {
    success: false,
    message: 'Draft saving not yet implemented',
  };
};

const approveTransaction: ServiceDataSourceHandler = async (_request) => {
  return {
    success: false,
    message: 'Transaction approval not yet implemented',
  };
};

const voidTransaction: ServiceDataSourceHandler = async (_request) => {
  return {
    success: false,
    message: 'Transaction void not yet implemented',
  };
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
  'admin-finance.transactions.void': voidTransaction,
};
