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
