/**
 * Income/Expense Transaction Adapter
 *
 * Handles database operations for simplified income and expense transactions.
 * Provides a user-friendly alternative to full double-entry journal entries.
 *
 * @module adapters/incomeExpenseTransaction
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, QueryOptions, type IBaseAdapter } from '@/adapters/base.adapter';
import { IncomeExpenseTransaction } from '@/models/incomeExpenseTransaction.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Transaction data with source details for source-based queries.
 */
export interface SourceTransaction {
  id: string;
  transaction_date: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string;
  reference: string | null;
  category_id: string | null;
  category_name: string | null;
  category_code: string | null;
  fund_id: string | null;
  fund_name: string | null;
  fund_code: string | null;
  header_id: string | null;
  line: number | null;
  created_at: string;
}

/**
 * Balance summary for a single financial source.
 */
export interface SourceBalance {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

/**
 * Aggregated balance summary across all sources.
 */
export interface AllSourcesBalance {
  total_income: number;
  total_expense: number;
  total_balance: number;
  transaction_count: number;
}

/**
 * Transaction data with fund details for fund-based queries.
 */
export interface FundTransaction {
  id: string;
  transaction_date: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string;
  reference: string | null;
  category_id: string | null;
  category_name: string | null;
  category_code: string | null;
  source_id: string | null;
  source_name: string | null;
  header_id: string | null;
  line: number | null;
  created_at: string;
}

/**
 * Balance summary for a single fund.
 */
export interface FundBalance {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

/**
 * Aggregated balance summary across all funds.
 */
export interface AllFundsBalance {
  total_income: number;
  total_expense: number;
  total_balance: number;
  transaction_count: number;
}

/**
 * Transaction data with category details for category-based queries.
 */
export interface CategoryTransaction {
  id: string;
  transaction_date: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string;
  reference: string | null;
  fund_id: string | null;
  fund_name: string | null;
  fund_code: string | null;
  source_id: string | null;
  source_name: string | null;
  header_id: string | null;
  line: number | null;
  created_at: string;
}

/**
 * Balance summary for a single category.
 */
export interface CategoryBalance {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

/**
 * Aggregated balance summary across all categories.
 */
export interface AllCategoriesBalance {
  total_income: number;
  total_expense: number;
  total_balance: number;
  transaction_count: number;
}

/**
 * Amount summary row for transaction headers.
 */
export interface HeaderAmountRow {
  header_id: string;
  transaction_type: 'income' | 'expense';
  total_amount: number;
  line_count: number;
  category_name?: string;
  source_name?: string;
}

/**
 * Interface for income/expense transaction database operations.
 * Extends IBaseAdapter with balance and aggregation methods.
 */
export interface IIncomeExpenseTransactionAdapter
  extends IBaseAdapter<IncomeExpenseTransaction> {
  /** Get all transactions for a header */
  getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]>;
  /** Get aggregated amounts per header */
  getHeaderAmounts(tenantId: string, headerIds?: string[]): Promise<HeaderAmountRow[]>;
  /** Get transactions by source */
  getBySourceId(sourceId: string, tenantId: string): Promise<SourceTransaction[]>;
  /** Get balance for a source */
  getSourceBalance(sourceId: string, tenantId: string): Promise<SourceBalance>;
  /** Get total balance across all sources */
  getAllSourcesBalance(tenantId: string): Promise<AllSourcesBalance>;
  /** Get transactions by fund */
  getByFundId(fundId: string, tenantId: string): Promise<FundTransaction[]>;
  /** Get balance for a fund */
  getFundBalance(fundId: string, tenantId: string): Promise<FundBalance>;
  /** Get total balance across all funds */
  getAllFundsBalance(tenantId: string): Promise<AllFundsBalance>;
  /** Get transactions by category */
  getByCategoryId(categoryId: string, tenantId: string): Promise<CategoryTransaction[]>;
  /** Get balance for a category */
  getCategoryBalance(categoryId: string, tenantId: string): Promise<CategoryBalance>;
  /** Get total balance across all categories */
  getAllCategoriesBalance(tenantId: string): Promise<AllCategoriesBalance>;
}

/**
 * Income/Expense Transaction adapter implementation.
 *
 * Provides database operations for simplified income/expense tracking including:
 * - Creating income and expense entries with category/fund/source assignment
 * - Balance calculations by source, fund, and category
 * - Aggregated reporting across all entities
 * - Header amount summaries for transaction batches
 *
 * This adapter provides a simpler interface than full double-entry
 * transactions while maintaining proper accounting categorization.
 *
 * @extends BaseAdapter<IncomeExpenseTransaction>
 * @implements IIncomeExpenseTransactionAdapter
 */
@injectable()
export class IncomeExpenseTransactionAdapter
  extends BaseAdapter<IncomeExpenseTransaction>
  implements IIncomeExpenseTransactionAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for income/expense transactions */
  protected tableName = 'income_expense_transactions';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    transaction_type,
    transaction_date,
    line,
    amount,
    description,
    reference,
    category_id,
    fund_id,
    source_id,
    account_id,
    header_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    { table: 'categories', foreignKey: 'category_id', select: ['id','code','name'] },
    { table: 'funds', foreignKey: 'fund_id', select: ['id','code','name','type'] },
    {
      table: 'financial_sources',
      foreignKey: 'source_id',
      alias: 'sources',
      select: ['id', 'name', 'source_type']
    },
    { table: 'accounts', foreignKey: 'account_id', select: ['id','name','account_type'] }
  ];

  /**
   * Get all transactions for a transaction header.
   *
   * @param headerId - Header ID to fetch transactions for
   * @returns Array of transactions ordered by line number
   */
  public async getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]> {
    const result = await this.fetch({
      filters: { header_id: { operator: 'eq', value: headerId } },
      order: { column: 'line', ascending: true }
    });
    return result.data;
  }

  /**
   * Get aggregated amounts per header using database RPC.
   * Returns total amounts and line counts grouped by header and transaction type.
   *
   * @param tenantId - Tenant ID to filter by
   * @param headerIds - Optional specific header IDs to filter
   * @returns Array of header amount summaries
   */
  public async getHeaderAmounts(tenantId: string, headerIds?: string[]): Promise<HeaderAmountRow[]> {
    const supabase = await this.getSupabaseClient();

    // Use RPC for efficient aggregation with category/source names
    const { data, error } = await supabase.rpc('get_header_amounts', {
      p_tenant_id: tenantId,
      p_header_ids: headerIds && headerIds.length > 0 ? headerIds : null,
    });

    if (error) {
      throw new Error(`Failed to fetch header amounts: ${error.message}`);
    }

    return (data as unknown as HeaderAmountRow[]) || [];
  }

  /**
   * Get all transactions for a financial source.
   *
   * @param sourceId - Source ID to fetch transactions for
   * @param tenantId - Tenant ID for isolation
   * @returns Array of transactions with related data
   */
  public async getBySourceId(sourceId: string, tenantId: string): Promise<SourceTransaction[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_source_transactions', {
      p_source_id: sourceId,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch source transactions: ${error.message}`);
    }

    return (data as unknown as SourceTransaction[]) || [];
  }

  /**
   * Get balance summary for a financial source.
   *
   * @param sourceId - Source ID to calculate balance for
   * @param tenantId - Tenant ID for isolation
   * @returns Balance summary with income, expense, and net balance
   */
  public async getSourceBalance(sourceId: string, tenantId: string): Promise<SourceBalance> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_source_balance', {
      p_source_id: sourceId,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch source balance: ${error.message}`);
    }

    const result = data?.[0] as unknown as SourceBalance;
    return result || { total_income: 0, total_expense: 0, balance: 0, transaction_count: 0 };
  }

  /**
   * Get aggregated balance across all financial sources.
   *
   * @param tenantId - Tenant ID for isolation
   * @returns Total balance summary across all sources
   */
  public async getAllSourcesBalance(tenantId: string): Promise<AllSourcesBalance> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_all_sources_balance', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch all sources balance: ${error.message}`);
    }

    const result = data?.[0] as unknown as AllSourcesBalance;
    return result || { total_income: 0, total_expense: 0, total_balance: 0, transaction_count: 0 };
  }

  /**
   * Get all transactions for a fund.
   *
   * @param fundId - Fund ID to fetch transactions for
   * @param tenantId - Tenant ID for isolation
   * @returns Array of transactions with related data
   */
  public async getByFundId(fundId: string, tenantId: string): Promise<FundTransaction[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_fund_transactions', {
      p_fund_id: fundId,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch fund transactions: ${error.message}`);
    }

    return (data as unknown as FundTransaction[]) || [];
  }

  /**
   * Get balance summary for a fund.
   *
   * @param fundId - Fund ID to calculate balance for
   * @param tenantId - Tenant ID for isolation
   * @returns Balance summary with income, expense, and net balance
   */
  public async getFundBalance(fundId: string, tenantId: string): Promise<FundBalance> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_fund_balance', {
      p_fund_id: fundId,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch fund balance: ${error.message}`);
    }

    const result = data?.[0] as unknown as FundBalance;
    return result || { total_income: 0, total_expense: 0, balance: 0, transaction_count: 0 };
  }

  /**
   * Get aggregated balance across all funds.
   *
   * @param tenantId - Tenant ID for isolation
   * @returns Total balance summary across all funds
   */
  public async getAllFundsBalance(tenantId: string): Promise<AllFundsBalance> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_all_funds_balance', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch all funds balance: ${error.message}`);
    }

    const result = data?.[0] as unknown as AllFundsBalance;
    return result || { total_income: 0, total_expense: 0, total_balance: 0, transaction_count: 0 };
  }

  /**
   * Get all transactions for a category.
   *
   * @param categoryId - Category ID to fetch transactions for
   * @param tenantId - Tenant ID for isolation
   * @returns Array of transactions with related data
   */
  public async getByCategoryId(categoryId: string, tenantId: string): Promise<CategoryTransaction[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_category_transactions', {
      p_category_id: categoryId,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch category transactions: ${error.message}`);
    }

    return (data as unknown as CategoryTransaction[]) || [];
  }

  /**
   * Get balance summary for a category.
   *
   * @param categoryId - Category ID to calculate balance for
   * @param tenantId - Tenant ID for isolation
   * @returns Balance summary with income, expense, and net balance
   */
  public async getCategoryBalance(categoryId: string, tenantId: string): Promise<CategoryBalance> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_category_balance', {
      p_category_id: categoryId,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch category balance: ${error.message}`);
    }

    const result = data?.[0] as unknown as CategoryBalance;
    return result || { total_income: 0, total_expense: 0, balance: 0, transaction_count: 0 };
  }

  /**
   * Get aggregated balance across all categories.
   *
   * @param tenantId - Tenant ID for isolation
   * @returns Total balance summary across all categories
   */
  public async getAllCategoriesBalance(tenantId: string): Promise<AllCategoriesBalance> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_all_categories_balance', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to fetch all categories balance: ${error.message}`);
    }

    const result = data?.[0] as unknown as AllCategoriesBalance;
    return result || { total_income: 0, total_expense: 0, total_balance: 0, transaction_count: 0 };
  }

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created transaction data
   */
  protected override async onAfterCreate(data: IncomeExpenseTransaction): Promise<void> {
    await this.auditService.logAuditEvent('create', 'income_expense_transaction', data.id, data);
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated transaction data
   */
  protected override async onAfterUpdate(data: IncomeExpenseTransaction): Promise<void> {
    await this.auditService.logAuditEvent('update', 'income_expense_transaction', data.id, data);
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted transaction
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'income_expense_transaction', id, { id });
  }
}
