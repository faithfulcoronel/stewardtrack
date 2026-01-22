/**
 * Financial Report Models
 * Data structures for Trial Balance, Income Statement, and Balance Sheet reports
 */

export interface FundSummary {
  fund_name: string;
  income: number;
  expenses: number;
  net_change: number;
}

// Trial Balance
export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totals: {
    debit: number;
    credit: number;
  };
  subtotalsByType: Record<string, { debit: number; credit: number }>;
  isBalanced: boolean;
}

// Enhanced Trial Balance with Period Breakdown
export type TrialBalanceViewBy = 'category' | 'source' | 'fund';

export interface PeriodBalance {
  period_id: string;
  period_name: string;
  debit: number;
  credit: number;
}

export interface EnhancedTrialBalanceRow {
  id: string;
  code: string;
  name: string;
  group_type: string;
  periods: PeriodBalance[];
  total_debit: number;
  total_credit: number;
}

export interface FiscalPeriodInfo {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface EnhancedTrialBalanceReport {
  viewBy: TrialBalanceViewBy;
  fiscalYear: {
    id: string;
    name: string;
  };
  periods: FiscalPeriodInfo[];
  rows: EnhancedTrialBalanceRow[];
  subtotalsByGroup: Record<string, {
    periods: PeriodBalance[];
    total_debit: number;
    total_credit: number;
  }>;
  grandTotal: {
    periods: PeriodBalance[];
    total_debit: number;
    total_credit: number;
  };
}

// Income Statement
export interface IncomeStatementRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  amount: number;
}

export interface IncomeStatementReport {
  revenueRows: IncomeStatementRow[];
  expenseRows: IncomeStatementRow[];
  totals: {
    revenue: number;
    expenses: number;
    netIncome: number;
  };
}

// Balance Sheet
export interface BalanceSheetRow {
  account_id: string;
  account_code: string;
  account_name: string;
  balance: number;
}

export interface BalanceSheetReport {
  assetRows: BalanceSheetRow[];
  liabilityRows: BalanceSheetRow[];
  equityRows: BalanceSheetRow[];
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
  };
  isBalanced: boolean;
}

// Report request parameters
export interface ReportDateParams {
  tenantId: string;
  endDate: string;
  startDate?: string;
}

// Budget vs Actual Report
export interface BudgetVsActualRow {
  budget_id: string;
  budget_name: string;
  category_id: string;
  category_name: string;
  budget_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
  is_favorable: boolean;
}

export interface BudgetVsActualReport {
  rows: BudgetVsActualRow[];
  totals: {
    totalBudget: number;
    totalActual: number;
    totalVariance: number;
    overallVariancePercentage: number;
  };
  summary: {
    budgetsOnTrack: number;
    budgetsOverSpent: number;
    budgetsUnderSpent: number;
  };
}
