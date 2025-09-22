import { injectable, inject } from "inversify";
import type { IFinanceDashboardAdapter } from "../adapters/financeDashboard.adapter";
import { TYPES } from "../lib/types";
import {
  MonthlyTrend,
  FinanceStats,
  FundBalance,
  SourceBalance,
} from "../models/financeDashboard.model";

export interface IFinanceDashboardRepository {
  getMonthlyTrends(startDate?: Date, endDate?: Date): Promise<MonthlyTrend[]>;
  getMonthlyStats(startDate: Date, endDate: Date): Promise<FinanceStats | null>;
  getFundBalances(): Promise<FundBalance[]>;
  getSourceBalances(): Promise<SourceBalance[]>;
}

@injectable()
export class FinanceDashboardRepository implements IFinanceDashboardRepository {
  constructor(
    @inject(TYPES.IFinanceDashboardAdapter)
    private adapter: IFinanceDashboardAdapter,
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
}
