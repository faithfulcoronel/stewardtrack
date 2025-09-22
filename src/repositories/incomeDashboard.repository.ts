import { injectable, inject } from "inversify";
import { TYPES } from "../lib/types";
import type {
  IIncomeDashboardAdapter,
  IncomeMetrics,
} from "../adapters/incomeDashboard.adapter";

export interface RecentDonation {
  date: string;
  donor: string;
  amount: number;
}

export interface DonationHistoryItem extends RecentDonation {
  status: string;
}

export interface IIncomeDashboardRepository {
  getMetrics(): Promise<IncomeMetrics>;
  getRecentDonations(limit?: number): Promise<RecentDonation[]>;
  getDonationHistory(limit?: number): Promise<DonationHistoryItem[]>;
}

@injectable()
export class IncomeDashboardRepository implements IIncomeDashboardRepository {
  constructor(
    @inject(TYPES.IIncomeDashboardAdapter)
    private adapter: IIncomeDashboardAdapter,
  ) {}

  getMetrics(): Promise<IncomeMetrics> {
    return this.adapter.fetchMetrics();
  }

  async getRecentDonations(limit = 5): Promise<RecentDonation[]> {
    const rows = await this.adapter.fetchRecentDonations(limit);
    return rows.map((r: any) => ({
      date: r.transaction_date,
      donor: r.account
        ? r.account.name
        : "Anonymous",
      amount: Number(r.amount),
    }));
  }

  async getDonationHistory(limit = 20): Promise<DonationHistoryItem[]> {
    const rows = await this.adapter.fetchDonationHistory(limit);
    return rows.map((r: any) => ({
      date: r.transaction_date,
      donor: r.account
        ? r.account.name
        : "Anonymous",
      amount: Number(r.amount),
      status: r.header?.status || "draft",
    }));
  }
}
