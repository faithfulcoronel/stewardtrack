/**
 * Budget Adapter
 *
 * Handles database operations for budget allocations.
 * Budgets track planned spending against categories for fiscal periods.
 *
 * @module adapters/budget
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { Budget } from '@/models/budget.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for budget database operations.
 * Extends IBaseAdapter with standard CRUD operations for budgets.
 */
export type IBudgetAdapter = IBaseAdapter<Budget>;

/**
 * Budget adapter implementation.
 *
 * Provides database operations for managing budget allocations including:
 * - Creating budget allocations for expense categories
 * - Updating budget amounts and periods
 * - Tracking budget vs actual spending
 *
 * Budgets are linked to categories for expense tracking and reporting.
 *
 * @extends BaseAdapter<Budget>
 * @implements IBudgetAdapter
 */
@injectable()
export class BudgetAdapter extends BaseAdapter<Budget> implements IBudgetAdapter {
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for budgets */
  protected tableName = 'budgets';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    name,
    amount,
    category_id,
    description,
    start_date,
    end_date,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'categories',
      foreignKey: 'category_id',
      select: ['id', 'name']
    }
  ];

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created budget data
   */
  protected override async onAfterCreate(data: Budget): Promise<void> {
    await this.auditService.logAuditEvent('create', 'budget', data.id, data);
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated budget data
   */
  protected override async onAfterUpdate(data: Budget): Promise<void> {
    await this.auditService.logAuditEvent('update', 'budget', data.id, data);
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted budget
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'budget', id, { id });
  }
}
