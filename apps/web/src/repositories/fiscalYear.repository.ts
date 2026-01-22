import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { FiscalYear } from '@/models/fiscalYear.model';
import { NotificationService } from '@/services/NotificationService';
import { FiscalYearValidator } from '@/validators/fiscalYear.validator';
import { TYPES } from '@/lib/types';
import type { IFiscalYearAdapter } from '@/adapters/fiscalYear.adapter';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tenantUtils } from '@/utils/tenantUtils';
import { format, addDays } from 'date-fns';

export interface IFiscalYearRepository extends BaseRepository<FiscalYear> {
  closeFiscalYear(
    fiscalYearId: string,
    userId: string,
    tenantId?: string
  ): Promise<{ success: boolean; message: string }>;
  getOpenPeriods(
    fiscalYearId: string,
    tenantId?: string
  ): Promise<{ id: string; name: string }[]>;
  rolloverBalancesToNextYear(
    fiscalYearId: string,
    userId: string,
    tenantId?: string
  ): Promise<{ success: boolean; nextYearId?: string }>;
}

@injectable()
export class FiscalYearRepository
  extends BaseRepository<FiscalYear>
  implements IFiscalYearRepository
{
  constructor(@inject(TYPES.IFiscalYearAdapter) adapter: IFiscalYearAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<FiscalYear>) {
    FiscalYearValidator.validate(data);
    return data;
  }

  protected override async afterCreate(data: FiscalYear) {
    NotificationService.showSuccess(`Fiscal year "${data.name}" created`);
  }

  protected override async beforeUpdate(id: string, data: Partial<FiscalYear>) {
    FiscalYearValidator.validate(data);
    return data;
  }

  protected override async afterUpdate(data: FiscalYear) {
    NotificationService.showSuccess(`Fiscal year "${data.name}" updated`);
  }

  /**
   * Get open fiscal periods for a fiscal year
   */
  async getOpenPeriods(
    fiscalYearId: string,
    tenantId?: string
  ): Promise<{ id: string; name: string }[]> {
    const resolvedTenantId = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolvedTenantId) {
      throw new Error('No tenant context available');
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('id, name')
      .eq('fiscal_year_id', fiscalYearId)
      .eq('tenant_id', resolvedTenantId)
      .eq('status', 'open');

    if (error) throw error;
    return data || [];
  }

  /**
   * Close a fiscal year
   *
   * Steps:
   * 1. Verify all periods are closed
   * 2. Generate closing entries (income/expense to retained earnings)
   * 3. Update fiscal year status to 'closed'
   */
  async closeFiscalYear(
    fiscalYearId: string,
    userId: string,
    tenantId?: string
  ): Promise<{ success: boolean; message: string }> {
    const resolvedTenantId = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolvedTenantId) {
      throw new Error('No tenant context available');
    }

    const supabase = await createSupabaseServerClient();

    // 1. Verify all periods are closed
    const openPeriods = await this.getOpenPeriods(fiscalYearId, resolvedTenantId);
    if (openPeriods.length > 0) {
      return {
        success: false,
        message: `Cannot close fiscal year: ${openPeriods.length} period(s) are still open. Close all periods first.`,
      };
    }

    // 2. Get fiscal year details
    const { data: fiscalYear, error: fyError } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('id', fiscalYearId)
      .eq('tenant_id', resolvedTenantId)
      .single();

    if (fyError || !fiscalYear) {
      throw new Error(`Fiscal year not found: ${fyError?.message}`);
    }

    if (fiscalYear.status === 'closed') {
      return {
        success: false,
        message: 'Fiscal year is already closed',
      };
    }

    // 3. Generate closing entries
    // Get retained earnings account
    const { data: retainedEarningsAccount, error: reError } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('tenant_id', resolvedTenantId)
      .eq('account_type', 'equity')
      .ilike('name', '%retained%earnings%')
      .limit(1)
      .single();

    if (reError || !retainedEarningsAccount) {
      return {
        success: false,
        message:
          'Cannot find retained earnings account. Please create an equity account named "Retained Earnings" first.',
      };
    }

    // Get income/expense totals via trial balance
    const { data: trialBalance, error: tbError } = await supabase.rpc(
      'report_trial_balance',
      {
        p_tenant_id: resolvedTenantId,
        p_end_date: fiscalYear.end_date,
      }
    );

    if (tbError) throw tbError;

    // Calculate net income (revenues - expenses)
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const row of trialBalance || []) {
      if (row.account_type === 'revenue') {
        totalRevenue += Number(row.credit_balance) - Number(row.debit_balance);
      } else if (row.account_type === 'expense') {
        totalExpenses += Number(row.debit_balance) - Number(row.credit_balance);
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    // Create closing entry header
    const { data: closingHeader, error: chError } = await supabase
      .from('financial_transaction_headers')
      .insert({
        tenant_id: resolvedTenantId,
        transaction_number: `CLOSE-${format(new Date(), 'yyyyMMdd')}-001`,
        transaction_date: fiscalYear.end_date,
        description: `Year-end closing entries for ${fiscalYear.name}`,
        reference: `FY-CLOSE-${fiscalYear.name}`,
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: userId,
        created_by: userId,
      })
      .select('id')
      .single();

    if (chError || !closingHeader) {
      throw new Error(`Failed to create closing entry: ${chError?.message}`);
    }

    // Create closing transactions
    // If net income > 0: DR Revenue accounts, CR Retained Earnings
    // If net income < 0: DR Retained Earnings, CR Expense accounts
    const closingTransactions = [];

    // Close revenue accounts
    for (const row of trialBalance || []) {
      if (row.account_type === 'revenue') {
        const balance = Number(row.credit_balance) - Number(row.debit_balance);
        if (balance !== 0) {
          closingTransactions.push({
            tenant_id: resolvedTenantId,
            header_id: closingHeader.id,
            type: 'closing_entry',
            description: `Close revenue: ${row.account_name}`,
            date: fiscalYear.end_date,
            coa_id: row.account_id,
            debit: balance > 0 ? balance : 0,
            credit: balance < 0 ? Math.abs(balance) : 0,
            created_by: userId,
          });
        }
      }
    }

    // Close expense accounts
    for (const row of trialBalance || []) {
      if (row.account_type === 'expense') {
        const balance = Number(row.debit_balance) - Number(row.credit_balance);
        if (balance !== 0) {
          closingTransactions.push({
            tenant_id: resolvedTenantId,
            header_id: closingHeader.id,
            type: 'closing_entry',
            description: `Close expense: ${row.account_name}`,
            date: fiscalYear.end_date,
            coa_id: row.account_id,
            debit: balance < 0 ? Math.abs(balance) : 0,
            credit: balance > 0 ? balance : 0,
            created_by: userId,
          });
        }
      }
    }

    // Transfer to retained earnings
    if (netIncome !== 0) {
      closingTransactions.push({
        tenant_id: resolvedTenantId,
        header_id: closingHeader.id,
        type: 'closing_entry',
        description: `Transfer net ${netIncome >= 0 ? 'income' : 'loss'} to retained earnings`,
        date: fiscalYear.end_date,
        coa_id: retainedEarningsAccount.id,
        debit: netIncome < 0 ? Math.abs(netIncome) : 0,
        credit: netIncome > 0 ? netIncome : 0,
        created_by: userId,
      });
    }

    // Insert closing transactions
    if (closingTransactions.length > 0) {
      const { error: ctError } = await supabase
        .from('financial_transactions')
        .insert(closingTransactions);

      if (ctError) {
        throw new Error(`Failed to create closing transactions: ${ctError.message}`);
      }
    }

    // 4. Update fiscal year status
    const { error: updateError } = await supabase
      .from('fiscal_years')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: userId,
      })
      .eq('id', fiscalYearId)
      .eq('tenant_id', resolvedTenantId);

    if (updateError) {
      throw new Error(`Failed to close fiscal year: ${updateError.message}`);
    }

    return {
      success: true,
      message: `Fiscal year "${fiscalYear.name}" closed successfully. Net ${netIncome >= 0 ? 'income' : 'loss'}: ${Math.abs(netIncome).toFixed(2)}`,
    };
  }

  /**
   * Rollover balances to the next fiscal year
   */
  async rolloverBalancesToNextYear(
    fiscalYearId: string,
    userId: string,
    tenantId?: string
  ): Promise<{ success: boolean; nextYearId?: string }> {
    const resolvedTenantId = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolvedTenantId) {
      throw new Error('No tenant context available');
    }

    const supabase = await createSupabaseServerClient();

    // Get current fiscal year
    const { data: fiscalYear, error: fyError } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('id', fiscalYearId)
      .eq('tenant_id', resolvedTenantId)
      .single();

    if (fyError || !fiscalYear) {
      throw new Error(`Fiscal year not found: ${fyError?.message}`);
    }

    // Calculate next year dates
    const nextStartDate = addDays(new Date(fiscalYear.end_date), 1);
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
    nextEndDate.setDate(nextEndDate.getDate() - 1);

    // Create next fiscal year
    const { data: nextYear, error: nyError } = await supabase
      .from('fiscal_years')
      .insert({
        tenant_id: resolvedTenantId,
        name: `FY ${nextStartDate.getFullYear()}`,
        start_date: format(nextStartDate, 'yyyy-MM-dd'),
        end_date: format(nextEndDate, 'yyyy-MM-dd'),
        status: 'open',
        created_by: userId,
      })
      .select('id')
      .single();

    if (nyError || !nextYear) {
      throw new Error(`Failed to create next fiscal year: ${nyError?.message}`);
    }

    // Get balance sheet accounts (assets, liabilities, equity)
    const { data: trialBalance, error: tbError } = await supabase.rpc(
      'report_trial_balance',
      {
        p_tenant_id: resolvedTenantId,
        p_end_date: fiscalYear.end_date,
      }
    );

    if (tbError) throw tbError;

    // Create opening balance transactions for balance sheet accounts
    const openingHeader = await supabase
      .from('financial_transaction_headers')
      .insert({
        tenant_id: resolvedTenantId,
        transaction_number: `OPEN-${format(nextStartDate, 'yyyyMMdd')}-001`,
        transaction_date: format(nextStartDate, 'yyyy-MM-dd'),
        description: `Opening balances for ${nextYear.id}`,
        reference: `FY-OPEN-${nextStartDate.getFullYear()}`,
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: userId,
        created_by: userId,
      })
      .select('id')
      .single();

    if (openingHeader.error || !openingHeader.data) {
      throw new Error(
        `Failed to create opening balance header: ${openingHeader.error?.message}`
      );
    }

    const openingTransactions = [];

    for (const row of trialBalance || []) {
      // Only carry forward balance sheet accounts
      if (['asset', 'liability', 'equity'].includes(row.account_type)) {
        const balance = Number(row.debit_balance) - Number(row.credit_balance);
        if (balance !== 0) {
          openingTransactions.push({
            tenant_id: resolvedTenantId,
            header_id: openingHeader.data.id,
            type: 'opening_balance',
            description: `Opening balance: ${row.account_name}`,
            date: format(nextStartDate, 'yyyy-MM-dd'),
            coa_id: row.account_id,
            debit: balance > 0 ? balance : 0,
            credit: balance < 0 ? Math.abs(balance) : 0,
            created_by: userId,
          });
        }
      }
    }

    if (openingTransactions.length > 0) {
      const { error: otError } = await supabase
        .from('financial_transactions')
        .insert(openingTransactions);

      if (otError) {
        throw new Error(`Failed to create opening balances: ${otError.message}`);
      }
    }

    return {
      success: true,
      nextYearId: nextYear.id,
    };
  }
}
