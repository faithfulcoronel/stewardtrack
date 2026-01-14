import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFinancialReportAdapter } from '@/adapters/financialReport.adapter';
import type {
  TrialBalanceReport,
  IncomeStatementRow,
  IncomeStatementReport,
  BalanceSheetRow,
  BalanceSheetReport,
  BudgetVsActualRow,
  BudgetVsActualReport,
} from '@/models/financialReport.model';

export interface IFinancialReportRepository {
  getTrialBalance(tenantId: string, endDate: string): Promise<TrialBalanceReport>;
  getIncomeStatement(tenantId: string, startDate: string, endDate: string): Promise<IncomeStatementReport>;
  getBalanceSheet(tenantId: string, endDate: string): Promise<BalanceSheetReport>;
  getBudgetVsActual(tenantId: string, startDate: string, endDate: string): Promise<BudgetVsActualReport>;
}

@injectable()
export class FinancialReportRepository implements IFinancialReportRepository {
  constructor(
    @inject(TYPES.IFinancialReportAdapter)
    private adapter: IFinancialReportAdapter
  ) {}

  /**
   * Get trial balance report with calculated totals and subtotals
   */
  async getTrialBalance(tenantId: string, endDate: string): Promise<TrialBalanceReport> {
    const rows = await this.adapter.fetchTrialBalance(tenantId, endDate);

    // Calculate subtotals by account type
    const accountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    const subtotalsByType: Record<string, { debit: number; credit: number }> = {};

    for (const type of accountTypes) {
      subtotalsByType[type] = { debit: 0, credit: 0 };
    }

    for (const row of rows) {
      const type = row.account_type?.toLowerCase();
      if (subtotalsByType[type]) {
        subtotalsByType[type].debit += Number(row.debit_balance) || 0;
        subtotalsByType[type].credit += Number(row.credit_balance) || 0;
      }
    }

    // Calculate grand totals
    const totalDebit = Object.values(subtotalsByType).reduce((sum, v) => sum + v.debit, 0);
    const totalCredit = Object.values(subtotalsByType).reduce((sum, v) => sum + v.credit, 0);
    const difference = Math.abs(totalDebit - totalCredit);

    return {
      rows,
      totals: { debit: totalDebit, credit: totalCredit },
      subtotalsByType,
      isBalanced: difference < 0.01,
    };
  }

  /**
   * Get income statement report with revenue/expense breakdown
   */
  async getIncomeStatement(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<IncomeStatementReport> {
    const rows = await this.adapter.fetchIncomeStatement(tenantId, startDate, endDate);

    const revenueRows: IncomeStatementRow[] = [];
    const expenseRows: IncomeStatementRow[] = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      if (row.account_type?.toLowerCase() === 'revenue') {
        totalRevenue += amount;
        if (amount !== 0) {
          revenueRows.push(row);
        }
      } else if (row.account_type?.toLowerCase() === 'expense') {
        totalExpenses += amount;
        if (amount !== 0) {
          expenseRows.push(row);
        }
      }
    }

    return {
      revenueRows,
      expenseRows,
      totals: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        netIncome: totalRevenue - totalExpenses,
      },
    };
  }

  /**
   * Get balance sheet report from trial balance data
   * Calculates proper balances based on account type normal balances
   */
  async getBalanceSheet(tenantId: string, endDate: string): Promise<BalanceSheetReport> {
    // Use trial balance to derive balance sheet data
    const trialData = await this.adapter.fetchTrialBalance(tenantId, endDate);

    const assetRows: BalanceSheetRow[] = [];
    const liabilityRows: BalanceSheetRow[] = [];
    const equityRows: BalanceSheetRow[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const row of trialData) {
      const type = row.account_type?.toLowerCase();
      const debit = Number(row.debit_balance) || 0;
      const credit = Number(row.credit_balance) || 0;

      if (type === 'asset') {
        // Assets have normal debit balance
        const balance = debit - credit;
        totalAssets += balance;
        if (balance !== 0) {
          assetRows.push({
            account_id: row.account_id,
            account_code: row.account_code,
            account_name: row.account_name,
            balance,
          });
        }
      } else if (type === 'liability') {
        // Liabilities have normal credit balance
        const balance = credit - debit;
        totalLiabilities += balance;
        if (balance !== 0) {
          liabilityRows.push({
            account_id: row.account_id,
            account_code: row.account_code,
            account_name: row.account_name,
            balance,
          });
        }
      } else if (type === 'equity') {
        // Equity has normal credit balance
        const balance = credit - debit;
        totalEquity += balance;
        if (balance !== 0) {
          equityRows.push({
            account_id: row.account_id,
            account_code: row.account_code,
            account_name: row.account_name,
            balance,
          });
        }
      }
    }

    // Verify accounting equation: Assets = Liabilities + Equity
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return {
      assetRows,
      liabilityRows,
      equityRows,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
      },
      isBalanced,
    };
  }

  /**
   * Get budget vs actual comparison report
   * Compares budgeted amounts to actual spending by category
   */
  async getBudgetVsActual(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<BudgetVsActualReport> {
    const rawRows = await this.adapter.fetchBudgetVsActual(tenantId, startDate, endDate);

    // Transform raw rows to include calculated variance and percentage
    const rows: BudgetVsActualRow[] = rawRows.map((row) => {
      const variance = row.budget_amount - row.actual_amount;
      const variancePercentage =
        row.budget_amount > 0
          ? ((row.budget_amount - row.actual_amount) / row.budget_amount) * 100
          : 0;
      // For expense budgets, under budget (positive variance) is favorable
      const isFavorable = variance >= 0;

      return {
        budget_id: row.budget_id,
        budget_name: row.budget_name,
        category_id: row.category_id,
        category_name: row.category_name,
        budget_amount: row.budget_amount,
        actual_amount: row.actual_amount,
        variance,
        variance_percentage: variancePercentage,
        is_favorable: isFavorable,
      };
    });

    // Calculate totals
    const totalBudget = rows.reduce((sum, r) => sum + r.budget_amount, 0);
    const totalActual = rows.reduce((sum, r) => sum + r.actual_amount, 0);
    const totalVariance = totalBudget - totalActual;
    const overallVariancePercentage =
      totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget) * 100 : 0;

    // Calculate summary
    const budgetsOnTrack = rows.filter(
      (r) => r.actual_amount <= r.budget_amount && r.actual_amount >= r.budget_amount * 0.8
    ).length;
    const budgetsOverSpent = rows.filter((r) => r.actual_amount > r.budget_amount).length;
    const budgetsUnderSpent = rows.filter(
      (r) => r.actual_amount < r.budget_amount * 0.8
    ).length;

    return {
      rows,
      totals: {
        totalBudget,
        totalActual,
        totalVariance,
        overallVariancePercentage,
      },
      summary: {
        budgetsOnTrack,
        budgetsOverSpent,
        budgetsUnderSpent,
      },
    };
  }
}
