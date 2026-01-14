import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { IFinanceDashboardRepository } from '@/repositories/financeDashboard.repository';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

// ==================== DASHBOARD PAGE HANDLERS ====================

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
const resolveDashboardHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const dashboardRepository = container.get<IFinanceDashboardRepository>(
    TYPES.IFinanceDashboardRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency
  const currency = await getTenantCurrency();

  // Get balance sheet totals from repository
  const balanceSheet = await dashboardRepository.getBalanceSheetTotals(tenant.id);

  return {
    eyebrow: 'Financial stewardship hub',
    headline: 'Monitor your financial health with confidence',
    description: 'Track income, expenses, and overall financial position with real-time insights and comprehensive reporting.',
    highlights: [
      'Double-entry bookkeeping ensures accurate financial records.',
      'Budget tracking helps maintain fiscal discipline.',
      'Generate professional financial statements instantly.',
    ],
    metrics: [
      {
        label: 'Total assets',
        value: formatCurrency(balanceSheet.totalAssets, currency),
        caption: 'Current asset balance',
      },
      {
        label: 'Total liabilities',
        value: formatCurrency(balanceSheet.totalLiabilities, currency),
        caption: 'Current obligations',
      },
      {
        label: 'Net position',
        value: formatCurrency(balanceSheet.netPosition, currency),
        caption: 'Assets minus liabilities',
      },
    ],
  };
};

/**
 * Dashboard KPIs Handler
 */
const resolveDashboardKpis: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const dashboardRepository = container.get<IFinanceDashboardRepository>(
    TYPES.IFinanceDashboardRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get monthly stats and source balances from repository
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [monthlyStats, sourceBalances] = await Promise.all([
    dashboardRepository.getMonthlyStats(monthStart, monthEnd),
    dashboardRepository.getSourceBalances(),
  ]);

  // Calculate cash balance from all sources
  const cashBalance = sourceBalances.reduce((sum, source) => sum + source.balance, 0);
  const mtdIncome = monthlyStats?.monthlyIncome ?? 0;
  const mtdExpenses = monthlyStats?.monthlyExpenses ?? 0;
  const netIncome = mtdIncome - mtdExpenses;

  return {
    items: [
      {
        id: 'kpi-cash-balance',
        label: 'Cash & bank balance',
        value: formatCurrency(cashBalance, currency),
        change: '',
        changeLabel: 'available funds',
        trend: 'flat',
        tone: 'informative',
        description: 'Total cash across all sources.',
      },
      {
        id: 'kpi-mtd-income',
        label: 'Month-to-date income',
        value: formatCurrency(mtdIncome, currency),
        change: '',
        changeLabel: 'this month',
        trend: mtdIncome > 0 ? 'up' : 'flat',
        tone: 'positive',
        description: 'Total income received this month.',
      },
      {
        id: 'kpi-mtd-expenses',
        label: 'Month-to-date expenses',
        value: formatCurrency(mtdExpenses, currency),
        change: '',
        changeLabel: 'this month',
        trend: mtdExpenses > 0 ? 'up' : 'flat',
        tone: 'neutral',
        description: 'Total expenses this month.',
      },
      {
        id: 'kpi-net-income',
        label: 'Net income',
        value: formatCurrency(netIncome, currency),
        change: '',
        changeLabel: 'income minus expenses',
        trend: netIncome >= 0 ? 'up' : 'down',
        tone: netIncome >= 0 ? 'positive' : 'negative',
        description: 'Income minus expenses this month.',
      },
    ],
  };
};

/**
 * Dashboard Quick Links Handler
 */
const resolveDashboardQuickLinks: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'link-record-income',
        title: 'Record income',
        description: 'Log donations, tithes, and other incoming funds.',
        href: '/admin/finance/transactions/entry?type=income',
        badge: 'Income',
        stat: 'Quick entry',
      },
      {
        id: 'link-record-expense',
        title: 'Record expense',
        description: 'Log bills, purchases, and outgoing payments.',
        href: '/admin/finance/transactions/entry?type=expense',
        badge: 'Expense',
        stat: 'Quick entry',
      },
      {
        id: 'link-view-reports',
        title: 'View reports',
        description: 'Access financial statements and analytics.',
        href: '/admin/finance/reports',
        badge: 'Reports',
        stat: 'Financial statements',
      },
      {
        id: 'link-manage-accounts',
        title: 'Chart of accounts',
        description: 'Manage your general ledger structure.',
        href: '/admin/finance/accounts',
        badge: 'Accounts',
        stat: 'GL accounts',
      },
      {
        id: 'link-manage-sources',
        title: 'Financial sources',
        description: 'Manage bank accounts, wallets, and cash funds.',
        href: '/admin/finance/sources',
        badge: 'Sources',
        stat: 'Money sources',
      },
      {
        id: 'link-manage-budgets',
        title: 'Budget management',
        description: 'Set and track budget allocations.',
        href: '/admin/finance/budgets',
        badge: 'Budgets',
        stat: 'Budget tracking',
      },
    ],
    actions: [
      {
        id: 'action-view-transactions',
        kind: 'link',
        config: {
          label: 'View all transactions',
          url: '/admin/finance/transactions',
          variant: 'secondary',
        },
      },
    ],
  };
};

/**
 * Dashboard Cash Flow Trend Handler
 */
const resolveDashboardCashFlowTrend: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const dashboardRepository = container.get<IFinanceDashboardRepository>(
    TYPES.IFinanceDashboardRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get last 12 months of trends
  const now = new Date();
  const startDate = subMonths(startOfMonth(now), 11);
  const endDate = endOfMonth(now);

  const trends = await dashboardRepository.getMonthlyTrends(startDate, endDate);

  // Map trends to chart data format
  const points = trends.map((trend) => ({
    label: trend.month,
    income: trend.income,
    expense: trend.expenses,
    net: trend.income - trend.expenses,
  }));

  // Get current month net
  const currentMonth = points[points.length - 1];
  const currentNet = currentMonth?.net ?? 0;
  const prevMonth = points[points.length - 2];
  const prevNet = prevMonth?.net ?? 0;
  const netChange = prevNet !== 0 ? ((currentNet - prevNet) / Math.abs(prevNet)) * 100 : 0;

  return {
    points,
    highlight: {
      label: 'Current month net',
      value: formatCurrency(currentNet, currency),
      change: netChange !== 0 ? `${netChange >= 0 ? '+' : ''}${netChange.toFixed(1)}%` : '',
      trend: currentNet > prevNet ? 'up' : currentNet < prevNet ? 'down' : 'flat',
    },
  };
};

/**
 * Dashboard Budget Overview Handler
 */
const resolveDashboardBudgetOverview: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Placeholder budget data
  return {
    items: [
      {
        id: 'budget-total',
        label: 'Total budget',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'annual budget',
        trend: 'flat',
        tone: 'informative',
        description: 'Total budgeted amount for the year.',
      },
      {
        id: 'budget-spent',
        label: 'Spent to date',
        value: formatCurrency(0, currency),
        change: '0%',
        changeLabel: 'of budget',
        trend: 'flat',
        tone: 'neutral',
        description: 'Total spent against budget.',
      },
      {
        id: 'budget-remaining',
        label: 'Remaining',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'available',
        trend: 'flat',
        tone: 'positive',
        description: 'Budget remaining to spend.',
      },
    ],
  };
};

/**
 * Dashboard Recent Activity Handler
 */
const resolveDashboardRecentActivity: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const dashboardRepository = container.get<IFinanceDashboardRepository>(
    TYPES.IFinanceDashboardRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant timezone and currency (cached)
  const timezone = await getTenantTimezone();
  const currency = await getTenantCurrency();

  // Get recent transactions from repository
  const transactions = await dashboardRepository.getRecentTransactions(5);

  if (transactions.length === 0) {
    return {
      items: [
        {
          id: 'empty-state',
          title: 'No recent activity',
          date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
          timeAgo: 'Today',
          description: 'Financial transactions will appear here as they are recorded.',
          category: 'Info',
          status: 'new',
          icon: '📋',
        },
      ],
    };
  }

  // Map transactions to activity items
  const items = transactions.map((tx) => {
    const icon = tx.type === 'income' ? '📈' : tx.type === 'expense' ? '📉' : '🔄';
    const status = tx.type === 'income' ? 'success' : tx.type === 'expense' ? 'warning' : 'info';

    return {
      id: tx.id,
      title: tx.category,
      date: formatDate(tx.date, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: formatDistanceToNow(tx.date),
      description: tx.description || `${tx.type === 'income' ? 'Received' : 'Paid'} ${formatCurrency(tx.amount, currency)}`,
      category: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
      status,
      icon,
    };
  });

  return { items };
};

// Export all dashboard handlers
export const adminFinanceDashboardHandlers: Record<string, ServiceDataSourceHandler> = {
  'admin-finance.dashboard.hero': resolveDashboardHero,
  'admin-finance.dashboard.kpis': resolveDashboardKpis,
  'admin-finance.dashboard.quickLinks': resolveDashboardQuickLinks,
  'admin-finance.dashboard.cashFlowTrend': resolveDashboardCashFlowTrend,
  'admin-finance.dashboard.budgetOverview': resolveDashboardBudgetOverview,
  'admin-finance.dashboard.recentActivity': resolveDashboardRecentActivity,
};
