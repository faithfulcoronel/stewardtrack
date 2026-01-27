/**
 * Opening Balance Adapter
 *
 * Handles database operations for fund opening balances.
 * Opening balances establish starting amounts for funds at the beginning of fiscal years.
 *
 * @module adapters/openingBalance
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { OpeningBalance } from '@/models/openingBalance.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for opening balance database operations.
 * Extends IBaseAdapter with standard CRUD operations for opening balances.
 */
export type IOpeningBalanceAdapter = IBaseAdapter<OpeningBalance>;

/**
 * Opening Balance adapter implementation.
 *
 * Provides database operations for managing fund opening balances including:
 * - Setting initial fund amounts for new fiscal years
 * - Linking balances to fiscal years, funds, and financial sources
 * - Managing balance posting status and audit trail
 * - Supporting carryover from previous fiscal year closings
 *
 * Opening balances ensure accurate fund tracking across fiscal year boundaries.
 *
 * @extends BaseAdapter<OpeningBalance>
 * @implements IOpeningBalanceAdapter
 */
@injectable()
export class OpeningBalanceAdapter
  extends BaseAdapter<OpeningBalance>
  implements IOpeningBalanceAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for fund opening balances */
  protected tableName = 'fund_opening_balances';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    fiscal_year_id,
    fund_id,
    source_id,
    amount,
    source,
    status,
    header_id,
    posted_at,
    posted_by,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /** Default relationships to include in queries */
  protected defaultRelationships = [
    {
      table: 'fiscal_years',
      foreignKey: 'fiscal_year_id',
      select: ['id', 'name']
    },
    {
      table: 'funds',
      foreignKey: 'fund_id',
      select: ['id', 'name', 'code']
    },
    {
      table: 'financial_sources',
      foreignKey: 'source_id',
      alias: 'financial_source',
      select: ['id', 'name', 'source_type']
    }
  ];

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created opening balance data
   */
  protected override async onAfterCreate(data: OpeningBalance): Promise<void> {
    await this.auditService.logAuditEvent('create', 'opening_balance', data.id, data);
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated opening balance data
   */
  protected override async onAfterUpdate(data: OpeningBalance): Promise<void> {
    await this.auditService.logAuditEvent('update', 'opening_balance', data.id, data);
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted opening balance
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'opening_balance', id, { id });
  }
}
