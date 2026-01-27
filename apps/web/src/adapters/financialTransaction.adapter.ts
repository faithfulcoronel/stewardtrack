/**
 * Financial Transaction Adapter
 *
 * Handles database operations for double-entry bookkeeping transaction lines.
 * Financial transactions are the individual debit/credit entries within a journal entry.
 *
 * @module adapters/financialTransaction
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { FinancialTransaction } from '@/models/financialTransaction.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

/**
 * Interface for financial transaction database operations.
 * Extends IBaseAdapter with standard CRUD operations for transaction lines.
 */
export type IFinancialTransactionAdapter = IBaseAdapter<FinancialTransaction>;

/**
 * Financial Transaction adapter implementation.
 *
 * Provides database operations for managing double-entry transaction lines including:
 * - Creating debit/credit entries linked to transaction headers
 * - Linking transactions to chart of accounts, funds, and sources
 * - Tracking reconciliation status for bank reconciliation
 * - Enforcing header status rules (no changes to posted/voided transactions)
 *
 * Transactions follow double-entry bookkeeping principles where
 * total debits must equal total credits within a header.
 *
 * @extends BaseAdapter<FinancialTransaction>
 * @implements IFinancialTransactionAdapter
 */
@injectable()
export class FinancialTransactionAdapter
  extends BaseAdapter<FinancialTransaction>
  implements IFinancialTransactionAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /** Database table name for financial transactions */
  protected tableName = 'financial_transactions';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    type,
    description,
    date,
    budget_id,
    category_id,
    fund_id,
    batch_id,
    coa_id,
    account_id,
    header_id,
    debit,
    credit,
    is_reconciled,
    reconciled_at,
    reconciled_by,
    source_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'chart_of_accounts',
      foreignKey: 'coa_id',
      select: ['id', 'code', 'name', 'account_type']
    },
    {
      table: 'financial_transaction_headers',
      foreignKey: 'header_id',
      select: ['id', 'transaction_number', 'status']
    },
    {
      table: 'funds',
      foreignKey: 'fund_id',
      select: ['id', 'name', 'type']
    },
    {
      table: 'accounts',
      foreignKey: 'account_id',
      select: ['id', 'name', 'member_id']
    },
    {
      table: 'financial_sources',
      foreignKey: 'source_id',
      select: ['id', 'name', 'source_type']
    }
  ];

  /**
   * Pre-create hook to validate header status.
   * Prevents adding transactions to posted or voided headers.
   *
   * @param data - Partial transaction data being created
   * @returns Modified transaction data
   * @throws Error if header is posted or voided
   */
  protected override async onBeforeCreate(
    data: Partial<FinancialTransaction>
  ): Promise<Partial<FinancialTransaction>> {
    const supabase = await this.getSupabaseClient();
    if (data.header_id) {
      const { data: header, error } = await supabase
        .from('financial_transaction_headers')
        .select('status')
        .eq('id', data.header_id)
        .single();
      if (error) throw error;
      if (header && (header.status === 'posted' || header.status === 'voided')) {
        throw new Error('Cannot add transactions to a posted or voided header');
      }
    }
    return data;
  }

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created transaction data
   */
  protected override async onAfterCreate(
    data: FinancialTransaction
  ): Promise<void> {
    await this.auditService.logAuditEvent(
      'create',
      'financial_transaction',
      data.id,
      data
    );
  }

  /**
   * Pre-update hook to validate header status.
   * Prevents modifying transactions of posted or voided headers.
   *
   * @param id - ID of transaction being updated
   * @param data - Partial transaction data to update
   * @returns Modified transaction data
   * @throws Error if header is posted or voided
   */
  protected override async onBeforeUpdate(
    id: string,
    data: Partial<FinancialTransaction>
  ): Promise<Partial<FinancialTransaction>> {
    const supabase = await this.getSupabaseClient();
    let headerId = data.header_id;
    if (!headerId) {
      const { data: tx, error } = await supabase
        .from(this.tableName)
        .select('header_id')
        .eq('id', id)
        .single();
      if (error) throw error;
      headerId = tx?.header_id;
    }

    if (headerId) {
      const { data: header, error } = await supabase
        .from('financial_transaction_headers')
        .select('status')
        .eq('id', headerId)
        .single();
      if (error) throw error;
      if (header && (header.status === 'posted' || header.status === 'voided')) {
        throw new Error(
          'Cannot modify transactions of a posted or voided header'
        );
      }
    }
    return data;
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated transaction data
   */
  protected override async onAfterUpdate(
    data: FinancialTransaction
  ): Promise<void> {
    await this.auditService.logAuditEvent(
      'update',
      'financial_transaction',
      data.id,
      data
    );
  }

  /**
   * Pre-delete hook to validate header status.
   * Prevents deleting transactions of posted or voided headers.
   *
   * @param id - ID of transaction being deleted
   * @throws Error if header is posted or voided
   */
  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: tx, error } = await supabase
      .from(this.tableName)
      .select('header_id')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (tx?.header_id) {
      const { data: header, error: headErr } = await supabase
        .from('financial_transaction_headers')
        .select('status')
        .eq('id', tx.header_id)
        .single();
      if (headErr) throw headErr;
      if (header && (header.status === 'posted' || header.status === 'voided')) {
        throw new Error(
          'Cannot delete transactions of a posted or voided header'
        );
      }
    }
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted transaction
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'financial_transaction', id, {
      id
    });
  }
}
