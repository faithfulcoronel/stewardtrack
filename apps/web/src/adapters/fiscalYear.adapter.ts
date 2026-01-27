/**
 * Fiscal Year Adapter
 *
 * Handles database operations for fiscal years.
 * Fiscal years define the accounting periods for financial reporting and budgeting.
 *
 * @module adapters/fiscalYear
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { FiscalYear } from '@/models/fiscalYear.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for fiscal year database operations.
 * Extends IBaseAdapter with standard CRUD operations for fiscal years.
 */
export type IFiscalYearAdapter = IBaseAdapter<FiscalYear>;

/**
 * Fiscal Year adapter implementation.
 *
 * Provides database operations for managing fiscal years including:
 * - Creating fiscal year periods with start and end dates
 * - Managing fiscal year status (open, closed)
 * - Tracking year closure with user and timestamp
 *
 * Fiscal years are the foundation for financial reporting,
 * budgeting, and period-based transaction tracking.
 *
 * @extends BaseAdapter<FiscalYear>
 * @implements IFiscalYearAdapter
 */
@injectable()
export class FiscalYearAdapter
  extends BaseAdapter<FiscalYear>
  implements IFiscalYearAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for fiscal years */
  protected tableName = 'fiscal_years';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    name,
    start_date,
    end_date,
    status,
    closed_at,
    closed_by,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created fiscal year data
   */
  protected override async onAfterCreate(data: FiscalYear): Promise<void> {
    await this.auditService.logAuditEvent('create', 'fiscal_year', data.id, data);
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated fiscal year data
   */
  protected override async onAfterUpdate(data: FiscalYear): Promise<void> {
    await this.auditService.logAuditEvent('update', 'fiscal_year', data.id, data);
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted fiscal year
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'fiscal_year', id, { id });
  }
}
