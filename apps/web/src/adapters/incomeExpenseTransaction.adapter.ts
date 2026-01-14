import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, QueryOptions, type IBaseAdapter } from '@/adapters/base.adapter';
import { IncomeExpenseTransaction } from '@/models/incomeExpenseTransaction.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

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

export interface SourceBalance {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

export interface AllSourcesBalance {
  total_income: number;
  total_expense: number;
  total_balance: number;
  transaction_count: number;
}

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

export interface FundBalance {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

export interface AllFundsBalance {
  total_income: number;
  total_expense: number;
  total_balance: number;
  transaction_count: number;
}

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

export interface CategoryBalance {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

export interface AllCategoriesBalance {
  total_income: number;
  total_expense: number;
  total_balance: number;
  transaction_count: number;
}

export interface IIncomeExpenseTransactionAdapter
  extends IBaseAdapter<IncomeExpenseTransaction> {
  getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]>;
  // Source methods
  getBySourceId(sourceId: string, tenantId: string): Promise<SourceTransaction[]>;
  getSourceBalance(sourceId: string, tenantId: string): Promise<SourceBalance>;
  getAllSourcesBalance(tenantId: string): Promise<AllSourcesBalance>;
  // Fund methods
  getByFundId(fundId: string, tenantId: string): Promise<FundTransaction[]>;
  getFundBalance(fundId: string, tenantId: string): Promise<FundBalance>;
  getAllFundsBalance(tenantId: string): Promise<AllFundsBalance>;
  // Category methods
  getByCategoryId(categoryId: string, tenantId: string): Promise<CategoryTransaction[]>;
  getCategoryBalance(categoryId: string, tenantId: string): Promise<CategoryBalance>;
  getAllCategoriesBalance(tenantId: string): Promise<AllCategoriesBalance>;
}

@injectable()
export class IncomeExpenseTransactionAdapter
  extends BaseAdapter<IncomeExpenseTransaction>
  implements IIncomeExpenseTransactionAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }
  protected tableName = 'income_expense_transactions';

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

  public async getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]> {
    const result = await this.fetch({
      filters: { header_id: { operator: 'eq', value: headerId } },
      order: { column: 'line', ascending: true }
    });
    return result.data;
  }

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

  // Fund methods
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

  // Category methods
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

  protected override async onAfterCreate(data: IncomeExpenseTransaction): Promise<void> {
    await this.auditService.logAuditEvent('create', 'income_expense_transaction', data.id, data);
  }

  protected override async onAfterUpdate(data: IncomeExpenseTransaction): Promise<void> {
    await this.auditService.logAuditEvent('update', 'income_expense_transaction', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'income_expense_transaction', id, { id });
  }
}
