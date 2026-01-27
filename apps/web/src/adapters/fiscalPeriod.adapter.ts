/**
 * Fiscal Period Adapter
 *
 * Handles database operations for fiscal periods (months/quarters within a fiscal year).
 * Fiscal periods subdivide fiscal years for detailed financial tracking and reporting.
 *
 * @module adapters/fiscalPeriod
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { FiscalPeriod } from '@/models/fiscalPeriod.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for fiscal period database operations.
 * Extends IBaseAdapter with standard CRUD operations for fiscal periods.
 */
export type IFiscalPeriodAdapter = IBaseAdapter<FiscalPeriod>;

/**
 * Fiscal Period adapter implementation.
 *
 * Provides database operations for managing fiscal periods including:
 * - Creating monthly/quarterly periods within fiscal years
 * - Managing period status (open, closed)
 * - Linking periods to parent fiscal years
 * - Tracking period closure with user and timestamp
 *
 * Fiscal periods enable granular financial reporting and
 * control over transaction posting within specific timeframes.
 *
 * @extends BaseAdapter<FiscalPeriod>
 * @implements IFiscalPeriodAdapter
 */
@injectable()
export class FiscalPeriodAdapter
  extends BaseAdapter<FiscalPeriod>
  implements IFiscalPeriodAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for fiscal periods */
  protected tableName = 'fiscal_periods';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    tenant_id,
    fiscal_year_id,
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

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'fiscal_years',
      foreignKey: 'fiscal_year_id',
      select: ['id', 'name']
    }
  ];

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created fiscal period data
   */
  protected override async onAfterCreate(data: FiscalPeriod): Promise<void> {
    await this.auditService.logAuditEvent('create', 'fiscal_period', data.id, data);
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated fiscal period data
   */
  protected override async onAfterUpdate(data: FiscalPeriod): Promise<void> {
    await this.auditService.logAuditEvent('update', 'fiscal_period', data.id, data);
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted fiscal period
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'fiscal_period', id, { id });
  }
}
