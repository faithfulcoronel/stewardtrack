import 'reflect-metadata';
import { injectable } from 'inversify';
import { apiClient } from '../../lib/apiClient';
import {
  MonthlyTrend,
  FinanceStatsRow,
  FundBalance,
  SourceBalance,
} from '../../models/financeDashboard.model';
import type { IFinanceDashboardAdapter } from '../financeDashboard.adapter';

@injectable()
export class FinanceDashboardApiAdapter implements IFinanceDashboardAdapter {
  async fetchMonthlyTrends(startDate?: Date, endDate?: Date): Promise<MonthlyTrend[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate.toISOString().substring(0, 10));
    if (endDate) params.set('endDate', endDate.toISOString().substring(0, 10));
    const data = await apiClient.get<MonthlyTrend[]>(
      `/financedashboard/monthly-trends?${params.toString()}`
    );
    return data ?? [];
  }

  async fetchMonthlyStats(
    startDate: Date,
    endDate: Date,
  ): Promise<FinanceStatsRow | null> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString().substring(0, 10),
      endDate: endDate.toISOString().substring(0, 10),
    });
    const data = await apiClient.get<FinanceStatsRow>(
      `/financedashboard/monthly-stats?${params.toString()}`
    );
    return data ?? null;
  }

  async fetchFundBalances(): Promise<FundBalance[]> {
    const data = await apiClient.get<FundBalance[]>(
      '/financedashboard/fund-balances'
    );
    return data ?? [];
  }

  async fetchSourceBalances(): Promise<SourceBalance[]> {
    const data = await apiClient.get<SourceBalance[]>(
      '/financedashboard/source-balances'
    );
    return data ?? [];
  }
}
