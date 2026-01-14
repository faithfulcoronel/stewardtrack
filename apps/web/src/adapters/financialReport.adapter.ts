import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  TrialBalanceRow,
  IncomeStatementRow,
} from '@/models/financialReport.model';

/**
 * Raw database row for budget vs actual comparison
 */
export interface BudgetActualRawRow {
  budget_id: string;
  budget_name: string;
  category_id: string;
  category_name: string;
  budget_amount: number;
  actual_amount: number;
}

export interface IFinancialReportAdapter {
  fetchTrialBalance(tenantId: string, endDate: string): Promise<TrialBalanceRow[]>;
  fetchTrialBalanceSimple(tenantId: string, endDate: string): Promise<TrialBalanceRow[]>;
  fetchIncomeStatement(tenantId: string, startDate: string, endDate: string): Promise<IncomeStatementRow[]>;
  fetchBudgetVsActual(tenantId: string, startDate: string, endDate: string): Promise<BudgetActualRawRow[]>;
}

@injectable()
export class FinancialReportAdapter implements IFinancialReportAdapter {
  private supabase: SupabaseClient | null = null;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  /**
   * Fetch trial balance data from the report_trial_balance RPC function
   */
  async fetchTrialBalance(tenantId: string, endDate: string): Promise<TrialBalanceRow[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('report_trial_balance', {
      p_tenant_id: tenantId,
      p_end_date: endDate,
    });

    if (error) {
      throw new Error(`Failed to fetch trial balance: ${error.message}`);
    }

    return (data || []) as TrialBalanceRow[];
  }

  /**
   * Fetch trial balance data from the report_trial_balance_simple RPC function
   * Uses income_expense_transactions with categories as accounts
   */
  async fetchTrialBalanceSimple(tenantId: string, endDate: string): Promise<TrialBalanceRow[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('report_trial_balance_simple', {
      p_tenant_id: tenantId,
      p_end_date: endDate,
    });

    if (error) {
      throw new Error(`Failed to fetch simple trial balance: ${error.message}`);
    }

    return (data || []) as TrialBalanceRow[];
  }

  /**
   * Fetch income statement data from the report_income_statement RPC function
   */
  async fetchIncomeStatement(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<IncomeStatementRow[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('report_income_statement', {
      p_tenant_id: tenantId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      throw new Error(`Failed to fetch income statement: ${error.message}`);
    }

    return (data || []) as IncomeStatementRow[];
  }

  /**
   * Fetch budget vs actual comparison data
   * Joins budgets with actual expense transactions for the same category and date range
   */
  async fetchBudgetVsActual(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<BudgetActualRawRow[]> {
    const supabase = await this.getSupabaseClient();

    // Get budgets that overlap with the date range
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        id,
        name,
        amount,
        category_id,
        start_date,
        end_date,
        categories:category_id (id, name)
      `)
      .eq('tenant_id', tenantId)
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .is('deleted_at', null);

    if (budgetError) {
      throw new Error(`Failed to fetch budgets: ${budgetError.message}`);
    }

    if (!budgets || budgets.length === 0) {
      return [];
    }

    // Get category IDs to filter transactions
    const categoryIds = budgets.map((b) => b.category_id).filter(Boolean);

    // Get actual expenses by category
    const { data: transactions, error: txError } = await supabase
      .from('income_expense_transactions')
      .select('category_id, amount')
      .eq('tenant_id', tenantId)
      .eq('transaction_type', 'expense')
      .in('category_id', categoryIds)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .is('deleted_at', null);

    if (txError) {
      throw new Error(`Failed to fetch transactions: ${txError.message}`);
    }

    // Aggregate actual spending by category
    const actualByCategory: Record<string, number> = {};
    for (const tx of transactions || []) {
      const catId = tx.category_id;
      if (catId) {
        actualByCategory[catId] = (actualByCategory[catId] || 0) + Number(tx.amount || 0);
      }
    }

    // Build the result
    const result: BudgetActualRawRow[] = budgets.map((budget) => {
      const category = budget.categories as { id: string; name: string } | null;
      return {
        budget_id: budget.id,
        budget_name: budget.name,
        category_id: budget.category_id,
        category_name: category?.name || 'Unknown',
        budget_amount: Number(budget.amount) || 0,
        actual_amount: actualByCategory[budget.category_id] || 0,
      };
    });

    return result;
  }
}
