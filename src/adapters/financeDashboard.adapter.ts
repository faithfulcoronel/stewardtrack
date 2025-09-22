import 'server-only';
import "reflect-metadata";
import { injectable } from "inversify";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tenantUtils } from "@/utils/tenantUtils";
import { format } from "date-fns";
import {
  MonthlyTrend,
  FinanceStatsRow,
  FundBalance,
  SourceBalance,
} from "@/models/financeDashboard.model";
import type { RequestContext } from "@/lib/server/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface IFinanceDashboardAdapter {
  fetchMonthlyTrends(
    startDate?: Date,
    endDate?: Date,
  ): Promise<MonthlyTrend[]>;
  fetchMonthlyStats(
    startDate: Date,
    endDate: Date,
  ): Promise<FinanceStatsRow | null>;
  fetchFundBalances(): Promise<FundBalance[]>;
  fetchSourceBalances(): Promise<SourceBalance[]>;
}

@injectable()
export class FinanceDashboardAdapter implements IFinanceDashboardAdapter {
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
  async fetchMonthlyTrends(
    startDate?: Date,
    endDate?: Date,
  ): Promise<MonthlyTrend[]> {
    const supabase = await this.getSupabaseClient();
    let query = supabase.from("finance_monthly_trends").select("*");

    if (startDate) {
      query = query.gte("month", format(startDate, "yyyy-MM"));
    }

    if (endDate) {
      query = query.lte("month", format(endDate, "yyyy-MM"));
    }

    const { data, error } = await query.order("month");
    if (error) throw error;
    return (data as MonthlyTrend[]) || [];
  }

  async fetchMonthlyStats(
    startDate: Date,
    endDate: Date,
  ): Promise<FinanceStatsRow | null> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return null;

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc("finance_monthly_stats", {
      p_tenant_id: tenantId,
      p_start_date: format(startDate, "yyyy-MM-dd"),
      p_end_date: format(endDate, "yyyy-MM-dd"),
    });
    if (error) throw error;
    return (data?.[0] as FinanceStatsRow) || null;
  }

  async fetchFundBalances(): Promise<FundBalance[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from("fund_balances_view")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (error) throw error;
    return (data as FundBalance[]) || [];
  }

  async fetchSourceBalances(): Promise<SourceBalance[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];

    const supabase = await this.getSupabaseClient();
    const { data: sources, error: srcErr } = await supabase
      .from("financial_sources")
      .select("id, name, coa_id")
      .eq("tenant_id", tenantId)
      .order("name");
    if (srcErr) throw srcErr;

    const { data: trial, error: trialErr } = await supabase.rpc(
      "report_trial_balance",
      { p_tenant_id: tenantId, p_end_date: format(new Date(), "yyyy-MM-dd") },
    );
    if (trialErr) throw trialErr;

    const balanceMap = new Map<string, number>(
      (trial || []).map((t: any) => [
        t.account_id as string,
        Number(t.debit_balance) - Number(t.credit_balance),
      ]),
    );

    return (sources || []).map(
      (s: any): SourceBalance => ({
        id: s.id,
        name: s.name,
        balance: balanceMap.get(s.coa_id as string) ?? 0,
      }),
    );
  }
}
