import "reflect-metadata";
import { injectable } from "inversify";
import { apiClient } from "../../lib/apiClient";
import { IncomeMetrics, type IIncomeDashboardAdapter } from "../incomeDashboard.adapter";

@injectable()
export class IncomeDashboardApiAdapter implements IIncomeDashboardAdapter {
  async fetchMetrics(): Promise<IncomeMetrics> {
    const data = await apiClient.get<IncomeMetrics>(
      "/dashboard/income/metrics"
    );
    return (
      data || {
        thisMonthTotal: 0,
        donorCount: 0,
        donationCountText: "From 0 donations",
        thisWeekTotal: 0,
        weekCountText: "From 0 donations",
        avgDonation: 0,
      }
    );
  }

  async fetchRecentDonations(limit: number): Promise<any[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const data = await apiClient.get<any[]>(
      `/dashboard/income/recent?${params.toString()}`
    );
    return data || [];
  }

  async fetchDonationHistory(limit: number): Promise<any[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const data = await apiClient.get<any[]>(
      `/dashboard/income/history?${params.toString()}`
    );
    return data || [];
  }
}
