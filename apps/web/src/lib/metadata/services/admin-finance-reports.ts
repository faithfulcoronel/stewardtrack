import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';

// ==================== HELPER FUNCTIONS ====================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ==================== REPORTS DASHBOARD HANDLERS ====================

const resolveReportsDashboardHero: ServiceDataSourceHandler = async (_request) => {
  return {
    eyebrow: 'Financial reporting',
    headline: 'Generate financial statements',
    description: 'Access comprehensive financial reports for oversight and compliance.',
    highlights: [
      'Generate trial balance to verify your books balance.',
      'Create income statements to track revenue and expenses.',
      'Produce balance sheets showing financial position.',
    ],
  };
};

const resolveReportsDashboardStandardReports: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'report-trial-balance',
        title: 'Trial balance',
        description: 'Verify all debits equal credits across all accounts.',
        href: '/admin/finance/reports/trial-balance',
        badge: 'Core',
        stat: 'Balance verification',
      },
      {
        id: 'report-income-statement',
        title: 'Income statement',
        description: 'View revenues and expenses for a period.',
        href: '/admin/finance/reports/income-statement',
        badge: 'Core',
        stat: 'Profit & Loss',
      },
      {
        id: 'report-balance-sheet',
        title: 'Balance sheet',
        description: 'See assets, liabilities, and equity position.',
        href: '/admin/finance/reports/balance-sheet',
        badge: 'Core',
        stat: 'Financial position',
      },
    ],
  };
};

const resolveReportsDashboardManagementReports: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'report-budget-vs-actual',
        title: 'Budget vs actual',
        description: 'Compare actual spending against budget.',
        href: '/admin/finance/reports/budget-vs-actual',
        badge: 'Analysis',
        stat: 'Variance report',
      },
      {
        id: 'report-cash-flow',
        title: 'Cash flow statement',
        description: 'Track cash inflows and outflows.',
        href: '/admin/finance/reports/cash-flow',
        badge: 'Analysis',
        stat: 'Cash management',
      },
      {
        id: 'report-fund',
        title: 'Fund report',
        description: 'View balances by fund designation.',
        href: '/admin/finance/reports/fund',
        badge: 'Analysis',
        stat: 'Fund tracking',
      },
    ],
  };
};

const resolveReportsDashboardRecentReports: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'empty-state',
        title: 'No recent reports',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timeAgo: 'Today',
        description: 'Generated reports will appear here for quick access.',
        category: 'Info',
        status: 'new',
        icon: '📊',
      },
    ],
  };
};

// ==================== TRIAL BALANCE HANDLERS ====================

const resolveTrialBalanceHeader: ServiceDataSourceHandler = async (_request) => {
  return {
    asOfDate: new Date().toLocaleDateString(),
    dateSelector: {
      type: 'single',
      defaultValue: new Date().toISOString().split('T')[0],
    },
    exportActions: [
      { id: 'export-pdf', label: 'Export PDF', handler: 'admin-finance.reports.export' },
      { id: 'export-excel', label: 'Export Excel', handler: 'admin-finance.reports.export' },
    ],
  };
};

const resolveTrialBalanceVerification: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'total-debits',
        label: 'Total debits',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'debit balances',
        trend: 'flat',
        tone: 'informative',
        description: 'Sum of all debit account balances.',
      },
      {
        id: 'total-credits',
        label: 'Total credits',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'credit balances',
        trend: 'flat',
        tone: 'informative',
        description: 'Sum of all credit account balances.',
      },
      {
        id: 'difference',
        label: 'Difference',
        value: formatCurrency(0),
        change: '0.00',
        changeLabel: 'should be zero',
        trend: 'flat',
        tone: 'positive',
        description: 'Debits minus credits (should be zero).',
      },
    ],
  };
};

const resolveTrialBalanceData: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Placeholder - will pull from database RPC function
  const rows: any[] = [];

  const columns = [
    { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
    { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
    { field: 'debit', headerName: 'Debit', type: 'currency', flex: 0.8 },
    { field: 'credit', headerName: 'Credit', type: 'currency', flex: 0.8 },
  ];

  const subtotals = [
    { label: 'Assets', debit: formatCurrency(0), credit: formatCurrency(0) },
    { label: 'Liabilities', debit: formatCurrency(0), credit: formatCurrency(0) },
    { label: 'Equity', debit: formatCurrency(0), credit: formatCurrency(0) },
    { label: 'Revenue', debit: formatCurrency(0), credit: formatCurrency(0) },
    { label: 'Expenses', debit: formatCurrency(0), credit: formatCurrency(0) },
  ];

  const grandTotal = {
    debit: formatCurrency(0),
    credit: formatCurrency(0),
    balanced: true,
  };

  return {
    rows,
    columns,
    subtotals,
    grandTotal,
  };
};

// ==================== INCOME STATEMENT HANDLERS ====================

const resolveIncomeStatementHeader: ServiceDataSourceHandler = async (_request) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    periodStart: startOfMonth.toLocaleDateString(),
    periodEnd: now.toLocaleDateString(),
    dateRangeSelector: {
      type: 'range',
      defaultStart: startOfMonth.toISOString().split('T')[0],
      defaultEnd: now.toISOString().split('T')[0],
    },
    exportActions: [
      { id: 'export-pdf', label: 'Export PDF', handler: 'admin-finance.reports.export' },
      { id: 'export-excel', label: 'Export Excel', handler: 'admin-finance.reports.export' },
    ],
  };
};

const resolveIncomeStatementSummary: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'total-revenue',
        label: 'Total revenue',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'for period',
        trend: 'flat',
        tone: 'positive',
        description: 'All income generated.',
      },
      {
        id: 'total-expenses',
        label: 'Total expenses',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'for period',
        trend: 'flat',
        tone: 'neutral',
        description: 'All costs incurred.',
      },
      {
        id: 'net-income',
        label: 'Net income',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'profit/loss',
        trend: 'flat',
        tone: 'informative',
        description: 'Revenue minus expenses.',
      },
    ],
  };
};

const resolveIncomeStatementRevenue: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
      { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
      { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
    ],
    subtotal: {
      label: 'Total Revenue',
      amount: formatCurrency(0),
    },
  };
};

const resolveIncomeStatementExpenses: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
      { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
      { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
    ],
    subtotal: {
      label: 'Total Expenses',
      amount: formatCurrency(0),
    },
  };
};

const resolveIncomeStatementNetIncome: ServiceDataSourceHandler = async (_request) => {
  const netIncome = 0;

  return {
    items: [
      { label: 'Total Revenue', value: formatCurrency(0) },
      { label: 'Total Expenses', value: formatCurrency(0) },
      { label: 'Net Income', value: formatCurrency(netIncome), isHighlight: true },
    ],
    highlight: {
      label: netIncome >= 0 ? 'Net Income' : 'Net Loss',
      value: formatCurrency(Math.abs(netIncome)),
      tone: netIncome >= 0 ? 'positive' : 'negative',
    },
  };
};

// ==================== BALANCE SHEET HANDLERS ====================

const resolveBalanceSheetHeader: ServiceDataSourceHandler = async (_request) => {
  return {
    asOfDate: new Date().toLocaleDateString(),
    dateSelector: {
      type: 'single',
      defaultValue: new Date().toISOString().split('T')[0],
    },
    exportActions: [
      { id: 'export-pdf', label: 'Export PDF', handler: 'admin-finance.reports.export' },
      { id: 'export-excel', label: 'Export Excel', handler: 'admin-finance.reports.export' },
    ],
  };
};

const resolveBalanceSheetEquation: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'total-assets',
        label: 'Total assets',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'resources owned',
        trend: 'flat',
        tone: 'positive',
        description: 'What the organization owns.',
      },
      {
        id: 'total-liabilities',
        label: 'Total liabilities',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'obligations',
        trend: 'flat',
        tone: 'warning',
        description: 'What the organization owes.',
      },
      {
        id: 'total-equity',
        label: 'Total equity',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'net worth',
        trend: 'flat',
        tone: 'informative',
        description: 'Assets minus liabilities.',
      },
    ],
  };
};

const resolveBalanceSheetAssets: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
      { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
      { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
    ],
    subtotal: {
      label: 'Total Assets',
      amount: formatCurrency(0),
    },
  };
};

const resolveBalanceSheetLiabilities: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
      { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
      { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
    ],
    subtotal: {
      label: 'Total Liabilities',
      amount: formatCurrency(0),
    },
  };
};

const resolveBalanceSheetEquity: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
      { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
      { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
    ],
    subtotal: {
      label: 'Total Equity',
      amount: formatCurrency(0),
    },
  };
};

const resolveBalanceSheetSummary: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      { label: 'Total Assets', value: formatCurrency(0) },
      { label: 'Total Liabilities', value: formatCurrency(0) },
      { label: 'Total Equity', value: formatCurrency(0) },
    ],
    highlight: {
      label: 'Balance Sheet',
      value: 'Balanced',
      tone: 'positive',
    },
    balanced: true,
  };
};

// ==================== EXPORT HANDLER ====================

const exportReport: ServiceDataSourceHandler = async (_request) => {
  return {
    success: false,
    message: 'Report export not yet implemented',
  };
};

// Export all handlers
export const adminFinanceReportsHandlers: Record<string, ServiceDataSourceHandler> = {
  // Reports dashboard handlers
  'admin-finance.reports.dashboard.hero': resolveReportsDashboardHero,
  'admin-finance.reports.dashboard.standardReports': resolveReportsDashboardStandardReports,
  'admin-finance.reports.dashboard.managementReports': resolveReportsDashboardManagementReports,
  'admin-finance.reports.dashboard.recentReports': resolveReportsDashboardRecentReports,
  // Trial balance handlers
  'admin-finance.reports.trialBalance.header': resolveTrialBalanceHeader,
  'admin-finance.reports.trialBalance.verification': resolveTrialBalanceVerification,
  'admin-finance.reports.trialBalance.data': resolveTrialBalanceData,
  // Income statement handlers
  'admin-finance.reports.incomeStatement.header': resolveIncomeStatementHeader,
  'admin-finance.reports.incomeStatement.summary': resolveIncomeStatementSummary,
  'admin-finance.reports.incomeStatement.revenue': resolveIncomeStatementRevenue,
  'admin-finance.reports.incomeStatement.expenses': resolveIncomeStatementExpenses,
  'admin-finance.reports.incomeStatement.netIncome': resolveIncomeStatementNetIncome,
  // Balance sheet handlers
  'admin-finance.reports.balanceSheet.header': resolveBalanceSheetHeader,
  'admin-finance.reports.balanceSheet.equation': resolveBalanceSheetEquation,
  'admin-finance.reports.balanceSheet.assets': resolveBalanceSheetAssets,
  'admin-finance.reports.balanceSheet.liabilities': resolveBalanceSheetLiabilities,
  'admin-finance.reports.balanceSheet.equity': resolveBalanceSheetEquity,
  'admin-finance.reports.balanceSheet.summary': resolveBalanceSheetSummary,
  // Export handler
  'admin-finance.reports.export': exportReport,
};
