import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFinanceDashboardAdapter } from '@/adapters/financeDashboard.adapter';
import type {
  MonthlyTrend,
  FinanceStats,
  FundBalance,
  SourceBalance,
  RecentTransaction,
  RecentTransactionRow,
  BalanceSheetTotals,
  DashboardSummary,
} from '@/models/financeDashboard.model';
import type { IFinancialReportRepository } from '@/repositories/financialReport.repository';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface IFinanceDashboardRepository {
  getMonthlyTrends(startDate?: Date, endDate?: Date): Promise<MonthlyTrend[]>;
  getMonthlyStats(startDate: Date, endDate: Date): Promise<FinanceStats | null>;
  getFundBalances(): Promise<FundBalance[]>;
  getSourceBalances(): Promise<SourceBalance[]>;
  getRecentTransactions(limit?: number): Promise<RecentTransaction[]>;
  getBalanceSheetTotals(tenantId: string): Promise<BalanceSheetTotals>;
  getDashboardSummary(tenantId: string): Promise<DashboardSummary>;
}

@injectable()
export class FinanceDashboardRepository implements IFinanceDashboardRepository {
  constructor(
    @inject(TYPES.IFinanceDashboardAdapter)
    private adapter: IFinanceDashboardAdapter,
    @inject(TYPES.IFinancialReportRepository)
    private reportRepository: IFinancialReportRepository,
  ) {}

  async getMonthlyTrends(
    startDate?: Date,
    endDate?: Date,
  ): Promise<MonthlyTrend[]> {
    const rows = await this.adapter.fetchMonthlyTrends(startDate, endDate);
    return rows.map((r: any) => ({
      month: new Date(`${r.month}-01`).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      }),
      income: Number(r.income),
      expenses: Number(r.expenses),
      percentageChange:
        r.percentage_change !== null ? Number(r.percentage_change) : null,
    }));
  }

  async getMonthlyStats(
    startDate: Date,
    endDate: Date,
  ): Promise<FinanceStats | null> {
    const row = await this.adapter.fetchMonthlyStats(startDate, endDate);
    if (!row) return null;
    return {
      monthlyIncome: Number(row.monthly_income),
      monthlyExpenses: Number(row.monthly_expenses),
      activeBudgets: Number(row.active_budgets),
      incomeByCategory: row.income_by_category || {},
      expensesByCategory: row.expenses_by_category || {},
    };
  }

  async getFundBalances(): Promise<FundBalance[]> {
    const rows = await this.adapter.fetchFundBalances();
    const map = new Map<string, FundBalance>();

    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        name: r.name,
        balance: Number(r.balance),
      });
    }

    return Array.from(map.values());
  }

  async getSourceBalances(): Promise<SourceBalance[]> {
    const rows = await this.adapter.fetchSourceBalances();
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      balance: Number(r.balance),
    }));
  }

  async getRecentTransactions(limit = 10): Promise<RecentTransaction[]> {
    const rows = await this.adapter.fetchRecentTransactions(limit);
    return rows.map((row) => this.transformTransactionRow(row));
  }

  async getBalanceSheetTotals(tenantId: string): Promise<BalanceSheetTotals> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const report = await this.reportRepository.getBalanceSheet(tenantId, today);

    return {
      totalAssets: report.totals.assets,
      totalLiabilities: report.totals.liabilities,
      netPosition: report.totals.assets - report.totals.liabilities,
    };
  }

  async getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Fetch all data in parallel
    const [balanceSheet, monthlyStats, recentTransactions, sourceBalances] =
      await Promise.all([
        this.getBalanceSheetTotals(tenantId),
        this.getMonthlyStats(monthStart, monthEnd),
        this.getRecentTransactions(5),
        this.getSourceBalances(),
      ]);

    // Calculate total cash balance from sources
    const cashBalance = sourceBalances.reduce(
      (sum, source) => sum + source.balance,
      0,
    );

    return {
      balanceSheet,
      monthlyStats: monthlyStats ?? {
        monthlyIncome: 0,
        monthlyExpenses: 0,
        activeBudgets: 0,
        incomeByCategory: {},
        expensesByCategory: {},
      },
      recentTransactions,
      cashBalance,
    };
  }

  private transformTransactionRow(row: RecentTransactionRow): RecentTransaction {
    // Determine transaction type based on amount sign or transaction_type field
    let type: 'income' | 'expense' | 'transfer' = 'expense';
    if (row.transaction_type) {
      const txType = row.transaction_type.toLowerCase();
      if (txType === 'income' || txType === 'revenue') {
        type = 'income';
      } else if (txType === 'transfer') {
        type = 'transfer';
      }
    } else if (row.amount > 0) {
      type = 'income';
    }

    return {
      id: row.header_id,
      date: new Date(row.date),
      category: row.category || 'Uncategorized',
      description: row.description || '',
      amount: Math.abs(Number(row.amount) || 0),
      type,
    };
  }
}
