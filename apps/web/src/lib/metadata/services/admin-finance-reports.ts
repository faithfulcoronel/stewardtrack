import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';
import type { IFinancialReportRepository } from '@/repositories/financialReport.repository';

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
  const timezone = await getTenantTimezone();
  return {
    items: [
      {
        id: 'empty-state',
        title: 'No recent reports',
        date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
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

const resolveTrialBalanceHero: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date from request or use today
  const endDate = (request.params?.endDate as string) || new Date().toISOString().split('T')[0];

  try {
    // Use the simple trial balance (from income_expense_transactions)
    const report = await reportRepository.getTrialBalanceSimple(tenant.id, endDate);
    const { totals, rows } = report;
    const accountCount = rows.filter(r => r.debit_balance !== 0 || r.credit_balance !== 0).length;
    const netBalance = totals.credit - totals.debit; // Income - Expenses

    return {
      variant: 'stats-panel',
      eyebrow: 'Financial Report',
      headline: 'Trial Balance',
      description: 'Summary of income and expense balances by category.',
      metrics: [
        {
          label: 'Total Income',
          value: formatCurrency(totals.credit, currency),
        },
        {
          label: 'Total Expenses',
          value: formatCurrency(totals.debit, currency),
        },
        {
          label: 'Categories',
          value: accountCount.toString(),
        },
        {
          label: 'Net Balance',
          value: formatCurrency(netBalance, currency),
        },
      ],
    };
  } catch (error) {
    console.error('Error fetching trial balance hero:', error);
    return {
      variant: 'stats-panel',
      eyebrow: 'Financial Report',
      headline: 'Trial Balance',
      description: 'Summary of income and expense balances by category.',
      metrics: [
        { label: 'Total Income', value: formatCurrency(0, currency) },
        { label: 'Total Expenses', value: formatCurrency(0, currency) },
        { label: 'Categories', value: '0' },
        { label: 'Net Balance', value: formatCurrency(0, currency) },
      ],
    };
  }
};

const resolveTrialBalanceHeader: ServiceDataSourceHandler = async (_request) => {
  const timezone = await getTenantTimezone();
  return {
    asOfDate: formatDate(new Date(), timezone),
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

const resolveTrialBalanceVerification: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date from request or use today
  const endDate = (request.params?.endDate as string) || new Date().toISOString().split('T')[0];

  try {
    // Use the simple trial balance (from income_expense_transactions)
    const report = await reportRepository.getTrialBalanceSimple(tenant.id, endDate);
    const { totals } = report;
    const netBalance = totals.credit - totals.debit; // Income - Expenses
    const hasSurplus = netBalance > 0;
    const hasDeficit = netBalance < 0;

    return {
      items: [
        {
          id: 'total-income',
          label: 'Total income',
          value: formatCurrency(totals.credit, currency),
          change: '',
          changeLabel: 'money received',
          trend: 'flat',
          tone: 'positive',
          description: 'Sum of all income transactions.',
        },
        {
          id: 'total-expenses',
          label: 'Total expenses',
          value: formatCurrency(totals.debit, currency),
          change: '',
          changeLabel: 'money spent',
          trend: 'flat',
          tone: 'informative',
          description: 'Sum of all expense transactions.',
        },
        {
          id: 'net-balance',
          label: 'Net balance',
          value: formatCurrency(netBalance, currency),
          change: hasSurplus ? 'Surplus' : hasDeficit ? 'Deficit' : 'Break-even',
          changeLabel: 'income minus expenses',
          trend: hasSurplus ? 'up' : hasDeficit ? 'down' : 'flat',
          tone: hasSurplus ? 'positive' : hasDeficit ? 'negative' : 'informative',
          description: hasSurplus ? 'You have more income than expenses.' : hasDeficit ? 'Expenses exceed income.' : 'Income equals expenses.',
        },
      ],
    };
  } catch (error) {
    console.error('Error fetching trial balance verification:', error);
    // Return zeros on error rather than crashing
    return {
      items: [
        { id: 'total-income', label: 'Total income', value: formatCurrency(0, currency), change: '', changeLabel: 'money received', trend: 'flat', tone: 'positive', description: 'Sum of all income transactions.' },
        { id: 'total-expenses', label: 'Total expenses', value: formatCurrency(0, currency), change: '', changeLabel: 'money spent', trend: 'flat', tone: 'informative', description: 'Sum of all expense transactions.' },
        { id: 'net-balance', label: 'Net balance', value: formatCurrency(0, currency), change: 'Break-even', changeLabel: 'income minus expenses', trend: 'flat', tone: 'informative', description: 'Income equals expenses.' },
      ],
    };
  }
};

const resolveTrialBalanceData: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date from request or use today
  const endDate = (request.params?.endDate as string) || new Date().toISOString().split('T')[0];

  // Use the simple trial balance (from income_expense_transactions)
  const report = await reportRepository.getTrialBalanceSimple(tenant.id, endDate);

  // Transform data into rows with formatting
  const rows = report.rows
    .filter(row => row.debit_balance !== 0 || row.credit_balance !== 0)
    .map(row => ({
      id: row.account_id,
      code: row.account_code,
      name: row.account_name,
      accountType: row.account_type,
      debit: row.debit_balance > 0 ? formatCurrency(row.debit_balance, currency) : '',
      credit: row.credit_balance > 0 ? formatCurrency(row.credit_balance, currency) : '',
      debitRaw: row.debit_balance,
      creditRaw: row.credit_balance,
    }));

  const columns = [
    { field: 'code', headerName: 'Category Code', type: 'text', flex: 0.6 },
    { field: 'name', headerName: 'Category Name', type: 'text', flex: 1.5 },
    { field: 'debit', headerName: 'Expenses', type: 'currency', flex: 0.8 },
    { field: 'credit', headerName: 'Income', type: 'currency', flex: 0.8 },
  ];

  // Use subtotals from repository (simple trial balance uses income/expense categories)
  const { subtotalsByType } = report;
  const subtotals = [
    { label: 'Income', debit: formatCurrency(subtotalsByType.income?.debit || 0, currency), credit: formatCurrency(subtotalsByType.income?.credit || 0, currency) },
    { label: 'Expenses', debit: formatCurrency(subtotalsByType.expense?.debit || 0, currency), credit: formatCurrency(subtotalsByType.expense?.credit || 0, currency) },
  ];

  const grandTotal = {
    debit: formatCurrency(report.totals.debit, currency),
    credit: formatCurrency(report.totals.credit, currency),
    balanced: report.isBalanced,
    debitRaw: report.totals.debit,
    creditRaw: report.totals.credit,
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
  const timezone = await getTenantTimezone();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    periodStart: formatDate(startOfMonth, timezone),
    periodEnd: formatDate(now, timezone),
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

const resolveIncomeStatementSummary: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date range from request or use current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = (request.params?.startDate as string) || startOfMonth.toISOString().split('T')[0];
  const endDate = (request.params?.endDate as string) || now.toISOString().split('T')[0];

  try {
    const report = await reportRepository.getIncomeStatement(tenant.id, startDate, endDate);
    const { totals } = report;

    return {
      items: [
        {
          id: 'total-revenue',
          label: 'Total revenue',
          value: formatCurrency(totals.revenue, currency),
          change: '',
          changeLabel: 'for period',
          trend: totals.revenue > 0 ? 'up' : 'flat',
          tone: 'positive',
          description: 'All income generated.',
        },
        {
          id: 'total-expenses',
          label: 'Total expenses',
          value: formatCurrency(totals.expenses, currency),
          change: '',
          changeLabel: 'for period',
          trend: totals.expenses > 0 ? 'up' : 'flat',
          tone: 'neutral',
          description: 'All costs incurred.',
        },
        {
          id: 'net-income',
          label: totals.netIncome >= 0 ? 'Net income' : 'Net loss',
          value: formatCurrency(Math.abs(totals.netIncome), currency),
          change: totals.netIncome >= 0 ? 'Surplus' : 'Deficit',
          changeLabel: 'profit/loss',
          trend: totals.netIncome > 0 ? 'up' : totals.netIncome < 0 ? 'down' : 'flat',
          tone: totals.netIncome >= 0 ? 'positive' : 'negative',
          description: 'Revenue minus expenses.',
        },
      ],
    };
  } catch (error) {
    console.error('Error fetching income statement summary:', error);
    return {
      items: [
        { id: 'total-revenue', label: 'Total revenue', value: formatCurrency(0, currency), change: '', changeLabel: 'for period', trend: 'flat', tone: 'positive', description: 'All income generated.' },
        { id: 'total-expenses', label: 'Total expenses', value: formatCurrency(0, currency), change: '', changeLabel: 'for period', trend: 'flat', tone: 'neutral', description: 'All costs incurred.' },
        { id: 'net-income', label: 'Net income', value: formatCurrency(0, currency), change: '', changeLabel: 'profit/loss', trend: 'flat', tone: 'informative', description: 'Revenue minus expenses.' },
      ],
    };
  }
};

const resolveIncomeStatementRevenue: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date range from request or use current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = (request.params?.startDate as string) || startOfMonth.toISOString().split('T')[0];
  const endDate = (request.params?.endDate as string) || now.toISOString().split('T')[0];

  try {
    const report = await reportRepository.getIncomeStatement(tenant.id, startDate, endDate);

    // Format revenue rows for display
    const revenueRows = report.revenueRows.map(row => ({
      id: row.account_id,
      code: row.account_code,
      name: row.account_name,
      amount: formatCurrency(Number(row.amount) || 0, currency),
      amountRaw: Number(row.amount) || 0,
    }));

    return {
      rows: revenueRows,
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
      ],
      subtotal: {
        label: 'Total Revenue',
        amount: formatCurrency(report.totals.revenue, currency),
      },
    };
  } catch (error) {
    console.error('Error fetching income statement revenue:', error);
    return {
      rows: [],
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
      ],
      subtotal: { label: 'Total Revenue', amount: formatCurrency(0, currency) },
    };
  }
};

const resolveIncomeStatementExpenses: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date range from request or use current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = (request.params?.startDate as string) || startOfMonth.toISOString().split('T')[0];
  const endDate = (request.params?.endDate as string) || now.toISOString().split('T')[0];

  try {
    const report = await reportRepository.getIncomeStatement(tenant.id, startDate, endDate);

    // Format expense rows for display
    const expenseRows = report.expenseRows.map(row => ({
      id: row.account_id,
      code: row.account_code,
      name: row.account_name,
      amount: formatCurrency(Number(row.amount) || 0, currency),
      amountRaw: Number(row.amount) || 0,
    }));

    return {
      rows: expenseRows,
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
      ],
      subtotal: {
        label: 'Total Expenses',
        amount: formatCurrency(report.totals.expenses, currency),
      },
    };
  } catch (error) {
    console.error('Error fetching income statement expenses:', error);
    return {
      rows: [],
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
      ],
      subtotal: { label: 'Total Expenses', amount: formatCurrency(0, currency) },
    };
  }
};

const resolveIncomeStatementNetIncome: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date range from request or use current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = (request.params?.startDate as string) || startOfMonth.toISOString().split('T')[0];
  const endDate = (request.params?.endDate as string) || now.toISOString().split('T')[0];

  try {
    const report = await reportRepository.getIncomeStatement(tenant.id, startDate, endDate);
    const { totals } = report;

    return {
      items: [
        { label: 'Total Revenue', value: formatCurrency(totals.revenue, currency) },
        { label: 'Total Expenses', value: formatCurrency(totals.expenses, currency) },
        { label: totals.netIncome >= 0 ? 'Net Income' : 'Net Loss', value: formatCurrency(Math.abs(totals.netIncome), currency), isHighlight: true },
      ],
      highlight: {
        label: totals.netIncome >= 0 ? 'Net Income' : 'Net Loss',
        value: formatCurrency(Math.abs(totals.netIncome), currency),
        tone: totals.netIncome >= 0 ? 'positive' : 'negative',
      },
    };
  } catch (error) {
    console.error('Error fetching income statement net income:', error);
    return {
      items: [
        { label: 'Total Revenue', value: formatCurrency(0, currency) },
        { label: 'Total Expenses', value: formatCurrency(0, currency) },
        { label: 'Net Income', value: formatCurrency(0, currency), isHighlight: true },
      ],
      highlight: { label: 'Net Income', value: formatCurrency(0, currency), tone: 'positive' },
    };
  }
};

// ==================== BALANCE SHEET HANDLERS ====================

const resolveBalanceSheetHeader: ServiceDataSourceHandler = async (_request) => {
  const timezone = await getTenantTimezone();
  return {
    asOfDate: formatDate(new Date(), timezone),
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

const resolveBalanceSheetEquation: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date from request or use today
  const endDate = (request.params?.endDate as string) || new Date().toISOString().split('T')[0];

  try {
    const report = await reportRepository.getBalanceSheet(tenant.id, endDate);
    const { totals, isBalanced } = report;

    return {
      items: [
        {
          id: 'total-assets',
          label: 'Total assets',
          value: formatCurrency(totals.assets, currency),
          change: '',
          changeLabel: 'resources owned',
          trend: totals.assets > 0 ? 'up' : 'flat',
          tone: 'positive',
          description: 'What the organization owns.',
        },
        {
          id: 'total-liabilities',
          label: 'Total liabilities',
          value: formatCurrency(totals.liabilities, currency),
          change: '',
          changeLabel: 'obligations',
          trend: totals.liabilities > 0 ? 'up' : 'flat',
          tone: 'warning',
          description: 'What the organization owes.',
        },
        {
          id: 'total-equity',
          label: 'Total equity',
          value: formatCurrency(totals.equity, currency),
          change: isBalanced ? 'Balanced' : 'Out of balance',
          changeLabel: 'net worth',
          trend: totals.equity > 0 ? 'up' : totals.equity < 0 ? 'down' : 'flat',
          tone: totals.equity >= 0 ? 'informative' : 'warning',
          description: 'Assets minus liabilities.',
        },
      ],
    };
  } catch (error) {
    console.error('Error fetching balance sheet equation:', error);
    return {
      items: [
        { id: 'total-assets', label: 'Total assets', value: formatCurrency(0, currency), change: '', changeLabel: 'resources owned', trend: 'flat', tone: 'positive', description: 'What the organization owns.' },
        { id: 'total-liabilities', label: 'Total liabilities', value: formatCurrency(0, currency), change: '', changeLabel: 'obligations', trend: 'flat', tone: 'warning', description: 'What the organization owes.' },
        { id: 'total-equity', label: 'Total equity', value: formatCurrency(0, currency), change: '', changeLabel: 'net worth', trend: 'flat', tone: 'informative', description: 'Assets minus liabilities.' },
      ],
    };
  }
};

const resolveBalanceSheetAssets: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date from request or use today
  const endDate = (request.params?.endDate as string) || new Date().toISOString().split('T')[0];

  try {
    const report = await reportRepository.getBalanceSheet(tenant.id, endDate);

    // Format asset rows for display
    const assetRows = report.assetRows.map(row => ({
      id: row.account_id,
      code: row.account_code,
      name: row.account_name,
      balance: formatCurrency(row.balance, currency),
      balanceRaw: row.balance,
    }));

    return {
      rows: assetRows,
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
      ],
      subtotal: {
        label: 'Total Assets',
        amount: formatCurrency(report.totals.assets, currency),
      },
    };
  } catch (error) {
    console.error('Error fetching balance sheet assets:', error);
    return {
      rows: [],
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
      ],
      subtotal: { label: 'Total Assets', amount: formatCurrency(0, currency) },
    };
  }
};

const resolveBalanceSheetLiabilities: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date from request or use today
  const endDate = (request.params?.endDate as string) || new Date().toISOString().split('T')[0];

  try {
    const report = await reportRepository.getBalanceSheet(tenant.id, endDate);

    // Format liability rows for display
    const liabilityRows = report.liabilityRows.map(row => ({
      id: row.account_id,
      code: row.account_code,
      name: row.account_name,
      balance: formatCurrency(row.balance, currency),
      balanceRaw: row.balance,
    }));

    return {
      rows: liabilityRows,
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
      ],
      subtotal: {
        label: 'Total Liabilities',
        amount: formatCurrency(report.totals.liabilities, currency),
      },
    };
  } catch (error) {
    console.error('Error fetching balance sheet liabilities:', error);
    return {
      rows: [],
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
      ],
      subtotal: { label: 'Total Liabilities', amount: formatCurrency(0, currency) },
    };
  }
};

const resolveBalanceSheetEquity: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date from request or use today
  const endDate = (request.params?.endDate as string) || new Date().toISOString().split('T')[0];

  try {
    const report = await reportRepository.getBalanceSheet(tenant.id, endDate);

    // Format equity rows for display
    const equityRows = report.equityRows.map(row => ({
      id: row.account_id,
      code: row.account_code,
      name: row.account_name,
      balance: formatCurrency(row.balance, currency),
      balanceRaw: row.balance,
    }));

    return {
      rows: equityRows,
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
      ],
      subtotal: {
        label: 'Total Equity',
        amount: formatCurrency(report.totals.equity, currency),
      },
    };
  } catch (error) {
    console.error('Error fetching balance sheet equity:', error);
    return {
      rows: [],
      columns: [
        { field: 'code', headerName: 'Account Code', type: 'text', flex: 0.6 },
        { field: 'name', headerName: 'Account Name', type: 'text', flex: 1.5 },
        { field: 'balance', headerName: 'Balance', type: 'currency', flex: 0.8 },
      ],
      subtotal: { label: 'Total Equity', amount: formatCurrency(0, currency) },
    };
  }
};

const resolveBalanceSheetSummary: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get date from request or use today
  const endDate = (request.params?.endDate as string) || new Date().toISOString().split('T')[0];

  try {
    const report = await reportRepository.getBalanceSheet(tenant.id, endDate);
    const { totals, isBalanced } = report;

    return {
      items: [
        { label: 'Total Assets', value: formatCurrency(totals.assets, currency) },
        { label: 'Total Liabilities', value: formatCurrency(totals.liabilities, currency) },
        { label: 'Total Equity', value: formatCurrency(totals.equity, currency) },
      ],
      highlight: {
        label: 'Balance Sheet',
        value: isBalanced ? 'Balanced' : 'Out of Balance',
        tone: isBalanced ? 'positive' : 'negative',
      },
      balanced: isBalanced,
    };
  } catch (error) {
    console.error('Error fetching balance sheet summary:', error);
    return {
      items: [
        { label: 'Total Assets', value: formatCurrency(0, currency) },
        { label: 'Total Liabilities', value: formatCurrency(0, currency) },
        { label: 'Total Equity', value: formatCurrency(0, currency) },
      ],
      highlight: { label: 'Balance Sheet', value: 'Error loading', tone: 'warning' },
      balanced: false,
    };
  }
};

// ==================== BUDGET VS ACTUAL HANDLERS ====================

const resolveBudgetVsActualHeader: ServiceDataSourceHandler = async (_request) => {
  const timezone = await getTenantTimezone();
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return {
    periodStart: formatDate(startOfYear, timezone),
    periodEnd: formatDate(now, timezone),
    dateRangeSelector: {
      type: 'range',
      defaultStart: startOfYear.toISOString().split('T')[0],
      defaultEnd: now.toISOString().split('T')[0],
    },
    exportActions: [
      { id: 'export-pdf', label: 'Export PDF', handler: 'admin-finance.reports.export' },
      { id: 'export-excel', label: 'Export Excel', handler: 'admin-finance.reports.export' },
    ],
  };
};

const resolveBudgetVsActualSummary: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  // Get date range from request or use YTD
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startDate = (request.params?.startDate as string) || startOfYear.toISOString().split('T')[0];
  const endDate = (request.params?.endDate as string) || now.toISOString().split('T')[0];

  try {
    const report = await reportRepository.getBudgetVsActual(tenant.id, startDate, endDate);
    const { totals, summary } = report;

    return {
      items: [
        {
          id: 'total-budget',
          label: 'Total budget',
          value: formatCurrency(totals.totalBudget, currency),
          change: '',
          changeLabel: 'budgeted',
          trend: 'flat',
          tone: 'informative',
          description: 'Total amount budgeted for the period.',
        },
        {
          id: 'total-actual',
          label: 'Actual spending',
          value: formatCurrency(totals.totalActual, currency),
          change: `${totals.overallVariancePercentage >= 0 ? '' : '-'}${Math.abs(100 - totals.overallVariancePercentage).toFixed(1)}%`,
          changeLabel: 'of budget used',
          trend: totals.totalActual <= totals.totalBudget ? 'flat' : 'up',
          tone: totals.totalActual <= totals.totalBudget ? 'positive' : 'negative',
          description: 'Total amount spent against budget.',
        },
        {
          id: 'total-variance',
          label: totals.totalVariance >= 0 ? 'Under budget' : 'Over budget',
          value: formatCurrency(Math.abs(totals.totalVariance), currency),
          change: totals.totalVariance >= 0 ? 'Favorable' : 'Unfavorable',
          changeLabel: 'variance',
          trend: totals.totalVariance >= 0 ? 'up' : 'down',
          tone: totals.totalVariance >= 0 ? 'positive' : 'negative',
          description: 'Difference between budget and actual.',
        },
      ],
      statusCounts: [
        { label: 'On track', count: summary.budgetsOnTrack, tone: 'positive' },
        { label: 'Over spent', count: summary.budgetsOverSpent, tone: 'negative' },
        { label: 'Under spent', count: summary.budgetsUnderSpent, tone: 'warning' },
      ],
    };
  } catch (error) {
    console.error('Error fetching budget vs actual summary:', error);
    return {
      items: [
        { id: 'total-budget', label: 'Total budget', value: formatCurrency(0, currency), change: '', changeLabel: 'budgeted', trend: 'flat', tone: 'informative', description: 'Total amount budgeted for the period.' },
        { id: 'total-actual', label: 'Actual spending', value: formatCurrency(0, currency), change: '0%', changeLabel: 'of budget used', trend: 'flat', tone: 'neutral', description: 'Total amount spent against budget.' },
        { id: 'total-variance', label: 'Variance', value: formatCurrency(0, currency), change: '', changeLabel: 'variance', trend: 'flat', tone: 'informative', description: 'Difference between budget and actual.' },
      ],
      statusCounts: [],
    };
  }
};

const resolveBudgetVsActualData: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  // Get date range from request or use YTD
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startDate = (request.params?.startDate as string) || startOfYear.toISOString().split('T')[0];
  const endDate = (request.params?.endDate as string) || now.toISOString().split('T')[0];

  try {
    const report = await reportRepository.getBudgetVsActual(tenant.id, startDate, endDate);

    const rows = report.rows.map((row) => ({
      id: row.budget_id,
      budgetName: row.budget_name,
      category: row.category_name,
      budgetAmount: formatCurrency(row.budget_amount, currency),
      actualAmount: formatCurrency(row.actual_amount, currency),
      variance: formatCurrency(Math.abs(row.variance), currency),
      varianceType: row.is_favorable ? 'favorable' : 'unfavorable',
      variancePercentage: `${row.variance_percentage >= 0 ? '' : '-'}${Math.abs(row.variance_percentage).toFixed(1)}%`,
      utilized: `${((row.actual_amount / row.budget_amount) * 100).toFixed(1)}%`,
      status: row.actual_amount > row.budget_amount ? 'over' : row.actual_amount >= row.budget_amount * 0.8 ? 'on-track' : 'under',
      // Raw values for sorting
      budgetAmountRaw: row.budget_amount,
      actualAmountRaw: row.actual_amount,
      varianceRaw: row.variance,
    }));

    const columns = [
      { field: 'budgetName', headerName: 'Budget', type: 'text', flex: 1.2 },
      { field: 'category', headerName: 'Category', type: 'text', flex: 1 },
      { field: 'budgetAmount', headerName: 'Budgeted', type: 'currency', flex: 0.8 },
      { field: 'actualAmount', headerName: 'Actual', type: 'currency', flex: 0.8 },
      { field: 'variance', headerName: 'Variance', type: 'currency', flex: 0.8 },
      { field: 'utilized', headerName: '% Used', type: 'percentage', flex: 0.6 },
      { field: 'status', headerName: 'Status', type: 'badge', flex: 0.6 },
    ];

    const grandTotal = {
      budgetAmount: formatCurrency(report.totals.totalBudget, currency),
      actualAmount: formatCurrency(report.totals.totalActual, currency),
      variance: formatCurrency(Math.abs(report.totals.totalVariance), currency),
      varianceType: report.totals.totalVariance >= 0 ? 'favorable' : 'unfavorable',
      utilized: report.totals.totalBudget > 0
        ? `${((report.totals.totalActual / report.totals.totalBudget) * 100).toFixed(1)}%`
        : '0%',
    };

    return {
      rows,
      columns,
      grandTotal,
      emptyState: {
        title: 'No budgets found',
        description: 'Create budgets in the Budget Management section to track spending.',
        action: {
          label: 'Create budget',
          href: '/admin/finance/budgets/manage',
        },
      },
    };
  } catch (error) {
    console.error('Error fetching budget vs actual data:', error);
    return {
      rows: [],
      columns: [
        { field: 'budgetName', headerName: 'Budget', type: 'text', flex: 1.2 },
        { field: 'category', headerName: 'Category', type: 'text', flex: 1 },
        { field: 'budgetAmount', headerName: 'Budgeted', type: 'currency', flex: 0.8 },
        { field: 'actualAmount', headerName: 'Actual', type: 'currency', flex: 0.8 },
        { field: 'variance', headerName: 'Variance', type: 'currency', flex: 0.8 },
        { field: 'utilized', headerName: '% Used', type: 'percentage', flex: 0.6 },
        { field: 'status', headerName: 'Status', type: 'badge', flex: 0.6 },
      ],
      grandTotal: null,
      emptyState: {
        title: 'No budgets found',
        description: 'Create budgets in the Budget Management section to track spending.',
        action: {
          label: 'Create budget',
          href: '/admin/finance/budgets/manage',
        },
      },
    };
  }
};

// ==================== EXPORT HANDLER ====================

interface ExportRequest {
  reportType: 'trial-balance' | 'income-statement' | 'balance-sheet' | 'budget-vs-actual';
  format: 'pdf' | 'excel' | 'csv';
  startDate?: string;
  endDate?: string;
}

const exportReport: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const reportRepository = container.get<IFinancialReportRepository>(TYPES.IFinancialReportRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const params = request.params as Partial<ExportRequest> | undefined;
  const reportType = params?.reportType || 'trial-balance';
  const format = params?.format || 'csv';
  const endDate = params?.endDate || new Date().toISOString().split('T')[0];

  // Get tenant currency for formatting
  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  // Fetch report data based on type using the repository
  let reportData: Record<string, unknown> = {};
  let reportTitle = '';

  try {
    if (reportType === 'trial-balance') {
      reportTitle = `Trial Balance as of ${formatDate(new Date(endDate), timezone)}`;
      const report = await reportRepository.getTrialBalance(tenant.id, endDate);

      const rows = report.rows.map(row => ({
        accountCode: row.account_code,
        accountName: row.account_name,
        accountType: row.account_type,
        debit: Number(row.debit_balance) || 0,
        credit: Number(row.credit_balance) || 0,
      }));

      reportData = {
        title: reportTitle,
        asOfDate: endDate,
        rows,
        totals: { debit: report.totals.debit, credit: report.totals.credit },
        currency,
      };
    } else if (reportType === 'income-statement') {
      const startDate = params?.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      reportTitle = `Income Statement ${formatDate(new Date(startDate), timezone)} to ${formatDate(new Date(endDate), timezone)}`;

      const report = await reportRepository.getIncomeStatement(tenant.id, startDate, endDate);

      const revenueRows = report.revenueRows.map(row => ({
        accountCode: row.account_code,
        accountName: row.account_name,
        amount: Number(row.amount) || 0,
      }));

      const expenseRows = report.expenseRows.map(row => ({
        accountCode: row.account_code,
        accountName: row.account_name,
        amount: Number(row.amount) || 0,
      }));

      reportData = {
        title: reportTitle,
        startDate,
        endDate,
        revenueRows,
        expenseRows,
        totals: report.totals,
        currency,
      };
    } else if (reportType === 'balance-sheet') {
      reportTitle = `Balance Sheet as of ${formatDate(new Date(endDate), timezone)}`;

      const report = await reportRepository.getBalanceSheet(tenant.id, endDate);

      const assetRows = report.assetRows.map(row => ({
        accountCode: row.account_code,
        accountName: row.account_name,
        balance: row.balance,
      }));

      const liabilityRows = report.liabilityRows.map(row => ({
        accountCode: row.account_code,
        accountName: row.account_name,
        balance: row.balance,
      }));

      const equityRows = report.equityRows.map(row => ({
        accountCode: row.account_code,
        accountName: row.account_name,
        balance: row.balance,
      }));

      reportData = {
        title: reportTitle,
        asOfDate: endDate,
        assetRows,
        liabilityRows,
        equityRows,
        totals: report.totals,
        currency,
      };
    } else if (reportType === 'budget-vs-actual') {
      const startDate = params?.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      reportTitle = `Budget vs Actual ${formatDate(new Date(startDate), timezone)} to ${formatDate(new Date(endDate), timezone)}`;

      const report = await reportRepository.getBudgetVsActual(tenant.id, startDate, endDate);

      const rows = report.rows.map(row => ({
        budgetName: row.budget_name,
        category: row.category_name,
        budgetAmount: row.budget_amount,
        actualAmount: row.actual_amount,
        variance: row.variance,
        variancePercentage: row.variance_percentage,
        isFavorable: row.is_favorable,
      }));

      reportData = {
        title: reportTitle,
        startDate,
        endDate,
        rows,
        totals: report.totals,
        summary: report.summary,
        currency,
      };
    }

    // Return the data for client-side export handling
    // In a production implementation, this could generate the actual file on the server
    return {
      success: true,
      reportType,
      format,
      data: reportData,
      message: `Report data prepared for ${format.toUpperCase()} export`,
      // Include metadata for the client to generate the file
      exportMetadata: {
        filename: `${reportType}-${endDate}.${format}`,
        contentType: format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Failed to generate ${reportType}: ${errorMessage}` };
  }
};

// Export all handlers
export const adminFinanceReportsHandlers: Record<string, ServiceDataSourceHandler> = {
  // Reports dashboard handlers
  'admin-finance.reports.dashboard.hero': resolveReportsDashboardHero,
  'admin-finance.reports.dashboard.standardReports': resolveReportsDashboardStandardReports,
  'admin-finance.reports.dashboard.managementReports': resolveReportsDashboardManagementReports,
  'admin-finance.reports.dashboard.recentReports': resolveReportsDashboardRecentReports,
  // Trial balance handlers
  'admin-finance.reports.trialBalance.hero': resolveTrialBalanceHero,
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
  // Budget vs actual handlers
  'admin-finance.reports.budgetVsActual.header': resolveBudgetVsActualHeader,
  'admin-finance.reports.budgetVsActual.summary': resolveBudgetVsActualSummary,
  'admin-finance.reports.budgetVsActual.data': resolveBudgetVsActualData,
  // Export handler
  'admin-finance.reports.export': exportReport,
};
