import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { ChartOfAccountService } from '@/services/ChartOfAccountService';
import type { BudgetService } from '@/services/BudgetService';

// ==================== DASHBOARD PAGE HANDLERS ====================

/**
 * Helper to format currency
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
const resolveDashboardHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get basic financial stats (placeholder - will be replaced with real data)
  const totalAssets = 0;
  const totalLiabilities = 0;
  const netPosition = totalAssets - totalLiabilities;

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
        value: formatCurrency(totalAssets),
        caption: 'Current asset balance',
      },
      {
        label: 'Total liabilities',
        value: formatCurrency(totalLiabilities),
        caption: 'Current obligations',
      },
      {
        label: 'Net position',
        value: formatCurrency(netPosition),
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

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Placeholder data - will be replaced with real calculations
  const cashBalance = 0;
  const mtdIncome = 0;
  const mtdExpenses = 0;
  const budgetVariance = 0;

  return {
    items: [
      {
        id: 'kpi-cash-balance',
        label: 'Cash & bank balance',
        value: formatCurrency(cashBalance),
        change: '',
        changeLabel: 'available funds',
        trend: 'flat',
        tone: 'informative',
        description: 'Total cash across all sources.',
      },
      {
        id: 'kpi-mtd-income',
        label: 'Month-to-date income',
        value: formatCurrency(mtdIncome),
        change: '',
        changeLabel: 'this month',
        trend: 'flat',
        tone: 'positive',
        description: 'Total income received this month.',
      },
      {
        id: 'kpi-mtd-expenses',
        label: 'Month-to-date expenses',
        value: formatCurrency(mtdExpenses),
        change: '',
        changeLabel: 'this month',
        trend: 'flat',
        tone: 'neutral',
        description: 'Total expenses this month.',
      },
      {
        id: 'kpi-budget-variance',
        label: 'Budget variance',
        value: formatCurrency(budgetVariance),
        change: '',
        changeLabel: 'vs budget',
        trend: budgetVariance >= 0 ? 'up' : 'down',
        tone: budgetVariance >= 0 ? 'positive' : 'negative',
        description: 'Actual vs budgeted spending.',
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

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Generate last 12 months of placeholder data
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      income: 0,
      expense: 0,
      net: 0,
    });
  }

  return {
    points: months,
    highlight: {
      label: 'Current month net',
      value: formatCurrency(0),
      change: '',
      trend: 'flat',
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

  // Placeholder budget data
  return {
    items: [
      {
        id: 'budget-total',
        label: 'Total budget',
        value: formatCurrency(0),
        change: '',
        changeLabel: 'annual budget',
        trend: 'flat',
        tone: 'informative',
        description: 'Total budgeted amount for the year.',
      },
      {
        id: 'budget-spent',
        label: 'Spent to date',
        value: formatCurrency(0),
        change: '0%',
        changeLabel: 'of budget',
        trend: 'flat',
        tone: 'neutral',
        description: 'Total spent against budget.',
      },
      {
        id: 'budget-remaining',
        label: 'Remaining',
        value: formatCurrency(0),
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

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Placeholder - will show recent transactions
  return {
    items: [
      {
        id: 'empty-state',
        title: 'No recent activity',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timeAgo: 'Today',
        description: 'Financial transactions will appear here as they are recorded.',
        category: 'Info',
        status: 'new',
        icon: '💰',
      },
    ],
  };
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
