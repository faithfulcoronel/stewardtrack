export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  percentageChange: number | null;
}

export interface FinanceStats {
  monthlyIncome: number;
  monthlyExpenses: number;
  activeBudgets: number;
  incomeByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
}

export interface FinanceStatsRow {
  monthly_income: number;
  monthly_expenses: number;
  active_budgets: number;
  income_by_category: Record<string, number>;
  expenses_by_category: Record<string, number>;
}

export interface FundBalance {
  id: string;
  name: string;
  balance: number;
}

export interface SourceBalance {
  id: string;
  name: string;
  balance: number;
}

/**
 * Raw recent transaction from the view
 */
export interface RecentTransactionRow {
  header_id: string;
  source_id: string | null;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  tenant_id: string;
  transaction_type?: string;
}

/**
 * Processed recent transaction for display
 */
export interface RecentTransaction {
  id: string;
  date: Date;
  category: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
}

/**
 * Balance sheet totals for dashboard
 */
export interface BalanceSheetTotals {
  totalAssets: number;
  totalLiabilities: number;
  netPosition: number;
}

/**
 * Dashboard summary with all metrics
 */
export interface DashboardSummary {
  balanceSheet: BalanceSheetTotals;
  monthlyStats: FinanceStats;
  recentTransactions: RecentTransaction[];
  cashBalance: number;
}
