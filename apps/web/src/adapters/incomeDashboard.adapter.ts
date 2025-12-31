import 'server-only';
import "reflect-metadata";
import { injectable } from "inversify";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tenantUtils } from "@/utils/tenantUtils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import type { RequestContext } from "@/lib/server/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface IncomeMetrics {
  thisMonthTotal: number;
  donorCount: number;
  donationCountText: string;
  thisWeekTotal: number;
  weekCountText: string;
  avgDonation: number;
}

export interface IIncomeDashboardAdapter {
  fetchMetrics(): Promise<IncomeMetrics>;
  fetchRecentDonations(limit: number): Promise<any[]>;
  fetchDonationHistory(limit: number): Promise<any[]>;
}

@injectable()
export class IncomeDashboardAdapter implements IIncomeDashboardAdapter {
  private supabase: SupabaseClient | null = null;
  private context: RequestContext = {} as RequestContext;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }
  async fetchMetrics(): Promise<IncomeMetrics> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    const [monthSummary, weekSummary, monthCount, weekCount, donorIds] =
      await Promise.all([
        this.fetchSummary(monthStart, monthEnd),
        this.fetchSummary(weekStart, weekEnd),
        this.fetchDonationCount(monthStart, monthEnd),
        this.fetchDonationCount(weekStart, weekEnd),
        this.fetchDonorIds(monthStart, monthEnd),
      ]);

    const sumIncome = (rows: any[] | undefined) =>
      rows?.reduce((sum, r) => sum + Number(r.income), 0) || 0;

    const thisMonthTotal = sumIncome(monthSummary);
    const thisWeekTotal = sumIncome(weekSummary);
    const avgDonation = monthCount > 0 ? thisMonthTotal / monthCount : 0;
    const donorCount = new Set(donorIds).size;

    return {
      thisMonthTotal,
      donorCount,
      donationCountText: `From ${monthCount} donations`,
      thisWeekTotal,
      weekCountText: `From ${weekCount} donations`,
      avgDonation,
    };
  }

  private async fetchSummary(start: Date, end: Date) {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc("report_category_financial", {
      p_tenant_id: tenantId,
      p_start_date: format(start, "yyyy-MM-dd"),
      p_end_date: format(end, "yyyy-MM-dd"),
      p_category_id: null,
    });
    if (error) throw error;
    return data || [];
  }

  private async fetchDonationCount(start: Date, end: Date) {
    const tenantId = await this.getTenantId();
    if (!tenantId) return 0;
    const supabase = await this.getSupabaseClient();
    const { count, error } = await supabase
      .from("income_expense_transactions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("transaction_type", "income")
      .gte("transaction_date", format(start, "yyyy-MM-dd"))
      .lte("transaction_date", format(end, "yyyy-MM-dd"));
    if (error) throw error;
    return count || 0;
  }

  private async fetchDonorIds(start: Date, end: Date) {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from("income_expense_transactions")
      .select("member_id")
      .eq("tenant_id", tenantId)
      .eq("transaction_type", "income")
      .not("member_id", "is", null)
      .gte("transaction_date", format(start, "yyyy-MM-dd"))
      .lte("transaction_date", format(end, "yyyy-MM-dd"));
    if (error) throw error;
    return (data || []).map((r: any) => r.member_id as string);
  }

  async fetchRecentDonations(limit: number): Promise<any[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from("income_expense_transactions")
      .select(
        `transaction_date, amount, account:accounts(name)`
      )
      .eq("tenant_id", tenantId)
      .eq("transaction_type", "income")
      .order("transaction_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async fetchDonationHistory(limit: number): Promise<any[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from("income_expense_transactions")
      .select(
        `transaction_date, amount, account:accounts(name), header:financial_transaction_headers(status)`
      )
      .eq("tenant_id", tenantId)
      .eq("transaction_type", "income")
      .order("transaction_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }
}

