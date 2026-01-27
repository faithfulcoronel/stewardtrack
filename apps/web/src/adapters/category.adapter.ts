/**
 * Category Adapter
 *
 * Handles database operations for financial categories (income, expense, budget).
 * Categories are used to classify transactions and budgets for reporting.
 *
 * @module adapters/category
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Category } from '@/models/category.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for category database operations.
 * Extends IBaseAdapter with standard CRUD operations for categories.
 */
export type ICategoryAdapter = IBaseAdapter<Category>;

/**
 * Category adapter implementation.
 *
 * Provides database operations for managing financial categories including:
 * - Income transaction categories
 * - Expense transaction categories
 * - Budget categories
 *
 * Categories can be linked to chart of accounts and funds for GL integration.
 *
 * @extends BaseAdapter<Category>
 * @implements ICategoryAdapter
 */
@injectable()
export class CategoryAdapter
  extends BaseAdapter<Category>
  implements ICategoryAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for categories */
  protected tableName = 'categories';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    type,
    code,
    name,
    description,
    is_system,
    is_active,
    sort_order,
    chart_of_account_id,
    fund_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'chart_of_accounts',
      foreignKey: 'chart_of_account_id',
      select: ['id', 'code', 'name', 'account_type']
    },
    { table: 'funds', foreignKey: 'fund_id', select: ['id', 'code', 'name', 'type'] }
  ];

  /**
   * Pre-create hook to set default values.
   * Sets is_active to true if not provided.
   *
   * @param data - Partial category data being created
   * @returns Modified category data with defaults applied
   */
  protected override async onBeforeCreate(data: Partial<Category>): Promise<Partial<Category>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created category data
   */
  protected override async onAfterCreate(data: Category): Promise<void> {
    await this.auditService.logAuditEvent('create', 'category', data.id, data);
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated category data
   */
  protected override async onAfterUpdate(data: Category): Promise<void> {
    await this.auditService.logAuditEvent('update', 'category', data.id, data);
  }

  /**
   * Pre-delete hook to validate category can be deleted.
   * Prevents deletion of categories with existing financial transactions.
   *
   * @param id - ID of category being deleted
   * @throws Error if category has linked financial transactions
   */
  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: tx, error } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('category_id', id)
      .limit(1);
    if (error) throw error;
    if (tx?.length) {
      throw new Error('Cannot delete category with existing financial transactions');
    }
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted category
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'category', id, { id });
  }
}
