/**
 * Financial Transaction Header Adapter
 *
 * Handles database operations for journal entry headers (transaction batches).
 * Headers group related debit/credit entries and manage workflow status.
 *
 * @module adapters/financialTransactionHeader
 */
import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { FinancialTransactionHeader } from '@/models/financialTransactionHeader.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import { format } from 'date-fns';

/**
 * Transaction summary row for aggregated reporting.
 */
export interface TransactionSummaryRow {
  /** Transaction status (draft, submitted, approved, posted, voided) */
  status: string;
  /** Type of transaction */
  transaction_type: string;
  /** Sum of amounts for this grouping */
  total_amount: number;
  /** Count of transactions in this grouping */
  transaction_count: number;
}

/**
 * Interface for financial transaction header database operations.
 * Extends BaseAdapter with workflow and batch transaction methods.
 */
export interface IFinancialTransactionHeaderAdapter
  extends BaseAdapter<FinancialTransactionHeader> {
  /**
   * Post a transaction header to the general ledger.
   * @param id - Header ID to post
   */
  postTransaction(id: string): Promise<void>;
  /**
   * Submit a transaction header for approval.
   * @param id - Header ID to submit
   */
  submitTransaction(id: string): Promise<void>;
  /**
   * Approve a submitted transaction header.
   * @param id - Header ID to approve
   */
  approveTransaction(id: string): Promise<void>;
  /**
   * Void a transaction header with reason.
   * @param id - Header ID to void
   * @param reason - Reason for voiding
   */
  voidTransaction(id: string, reason: string): Promise<void>;
  /**
   * Get all transaction line entries for a header.
   * @param headerId - Header ID to fetch entries for
   */
  getTransactionEntries(headerId: string): Promise<any[]>;
  /**
   * Check if a transaction header is balanced (debits equal credits).
   * @param headerId - Header ID to check
   */
  isTransactionBalanced(headerId: string): Promise<boolean>;
  /**
   * Create a header with its transaction lines atomically.
   * @param data - Header data
   * @param transactions - Array of transaction line entries
   */
  createWithTransactions(
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }>;
  /**
   * Update a header and replace its transaction lines.
   * @param id - Header ID to update
   * @param data - Header data updates
   * @param transactions - New transaction line entries
   */
  updateWithTransactions(
    id: string,
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }>;
  /**
   * Get headers that have unmapped transaction lines.
   */
  getUnmappedHeaders(): Promise<FinancialTransactionHeader[]>;
  /**
   * Get transaction summary with aggregated totals.
   * @param tenantId - Tenant ID
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   */
  getTransactionSummary(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionSummaryRow[]>;
}

/**
 * Financial Transaction Header adapter implementation.
 *
 * Provides database operations for managing journal entry headers including:
 * - Creating transaction batches with auto-generated transaction numbers
 * - Managing workflow status (draft → submitted → approved → posted)
 * - Voiding posted transactions with audit trail
 * - Batch creation/update with atomic transaction line handling
 * - Balance validation for double-entry compliance
 *
 * Headers serve as the parent record for grouped debit/credit entries,
 * ensuring balanced transactions before posting to the general ledger.
 *
 * @extends BaseAdapter<FinancialTransactionHeader>
 * @implements IFinancialTransactionHeaderAdapter
 */
@injectable()
export class FinancialTransactionHeaderAdapter
  extends BaseAdapter<FinancialTransactionHeader>
  implements IFinancialTransactionHeaderAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  /**
   * Get tenant ID from context or session.
   * @returns Tenant ID
   */
  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }

  /** Database table name for transaction headers */
  protected tableName = 'financial_transaction_headers';

  /** Default fields to select in queries */
  protected defaultSelect = `
    id,
    transaction_number,
    transaction_date,
    description,
    reference,
    source_id,
    status,
    posted_at,
    posted_by,
    voided_at,
    voided_by,
    void_reason,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  /** Default relationships to include in queries */
  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'financial_sources',
      foreignKey: 'source_id',
      select: ['id', 'name', 'source_type']
    }
  ];

  /**
   * Pre-create hook to set default values and generate transaction number.
   * Sets status to draft and auto-generates a sequenced transaction number.
   *
   * @param data - Partial header data being created
   * @returns Modified header data with defaults applied
   */
  protected override async onBeforeCreate(data: Partial<FinancialTransactionHeader>): Promise<Partial<FinancialTransactionHeader>> {
    // Set default values
    if (!data.status) {
      data.status = 'draft';
    }

    // Generate transaction number if not provided
    if (!data.transaction_number) {
      data.transaction_number = await this.generateTransactionNumber(
        data.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        data.status ?? 'draft'
      );
    }

    return data;
  }

  /**
   * Post-create hook to log audit event.
   *
   * @param data - Created header data
   */
  protected override async onAfterCreate(data: FinancialTransactionHeader): Promise<void> {
    await this.auditService.logAuditEvent('create', 'financial_transaction_header', data.id, data);
  }

  /**
   * Pre-update hook to validate and enforce status transition rules.
   * Prevents invalid status changes and sets metadata for posting/voiding.
   *
   * @param id - ID of header being updated
   * @param data - Partial header data to update
   * @returns Modified header data with status metadata
   * @throws Error for invalid status transitions or missing void reason
   */
  protected override async onBeforeUpdate(id: string, data: Partial<FinancialTransactionHeader>): Promise<Partial<FinancialTransactionHeader>> {
    // Get current header data
    const supabase = await this.getSupabaseClient();
    const { data: currentHeader, error } = await supabase
      .from(this.tableName)
      .select('status')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Validate status changes
    if (data.status && currentHeader) {
      if (currentHeader.status === 'posted' && data.status === 'draft') {
        throw new Error('Cannot change status from posted to draft');
      }

      if (currentHeader.status === 'voided' && data.status !== 'voided') {
        throw new Error('Cannot change status of a voided transaction');
      }

      // If changing to posted, set posted_at and posted_by
      if (data.status === 'posted' && currentHeader.status !== 'posted') {
        data.posted_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        data.posted_by = user?.id;
      }

      // If changing to voided, set voided_at and voided_by
      if (data.status === 'voided' && currentHeader.status !== 'voided') {
        data.voided_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        data.voided_by = user?.id;

        // Require void reason
        if (!data.void_reason) {
          throw new Error('Void reason is required when voiding a transaction');
        }
      }
    }

    return data;
  }

  /**
   * Post-update hook to log audit event.
   *
   * @param data - Updated header data
   */
  protected override async onAfterUpdate(data: FinancialTransactionHeader): Promise<void> {
    await this.auditService.logAuditEvent('update', 'financial_transaction_header', data.id, data);
  }

  /**
   * Pre-delete hook to validate header can be deleted.
   * Prevents deletion of posted/voided headers and cascades to transaction lines.
   *
   * @param id - ID of header being deleted
   * @throws Error if header is posted or voided
   */
  protected override async onBeforeDelete(id: string): Promise<void> {
    // Check status of header before allowing delete
    const supabase = await this.getSupabaseClient();
    const { data: header, error: headerError } = await supabase
      .from(this.tableName)
      .select('status')
      .eq('id', id)
      .single();

    if (headerError) throw headerError;
    if (header && (header.status === 'posted' || header.status === 'voided')) {
      throw new Error(`Cannot delete a ${header.status} transaction`);
    }

    // Remove all associated transactions for this header
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');

    const { error: deleteError } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('header_id', id)
      .eq('tenant_id', tenantId);

    if (deleteError) throw deleteError;
  }

  /**
   * Post-delete hook to log audit event.
   *
   * @param id - ID of deleted header
   */
  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'financial_transaction_header', id, { id });
  }

  /**
   * Generate a unique transaction number based on date and status.
   * Format: PREFIX-YYYYMM-SEQUENCE (e.g., TRX-202601-0001)
   *
   * @param date - Transaction date for month prefix
   * @param status - Transaction status for prefix selection
   * @returns Generated transaction number
   */
  private async generateTransactionNumber(date: string, status: string): Promise<string> {
    const supabase = await this.getSupabaseClient();
    const prefixMap: Record<string, string> = {
      draft: 'DFT',
      submitted: 'SUB',
      approved: 'APP',
      posted: 'TRX',
      voided: 'TRX'
    };
    const prefix = prefixMap[status] || 'TRX';

    // Format: PREFIX-YYYYMM-SEQUENCE
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    
    // Get current sequence for this month
    const { data, error } = await supabase
      .from(this.tableName)
      .select('transaction_number')
      .ilike('transaction_number', `${prefix}-${year}${month}-%`)
      .order('transaction_number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    let sequence = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].transaction_number;
      const lastSequence = parseInt(lastNumber.split('-')[2]);
      sequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
    }
    
    return `${prefix}-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Post a transaction to the general ledger via database function.
   * Marks the header as posted and makes entries permanent.
   *
   * @param id - Header ID to post
   * @throws Error if posting fails
   */
  public async postTransaction(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.rpc('post_transaction', {
      p_header_id: id,
      p_user_id: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
  }

  /**
   * Submit a transaction for approval via database function.
   * Changes status from draft to submitted.
   *
   * @param id - Header ID to submit
   * @throws Error if submission fails
   */
  public async submitTransaction(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.rpc('submit_transaction', {
      p_header_id: id,
      p_user_id: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
  }

  /**
   * Approve a submitted transaction via database function.
   * Changes status from submitted to approved.
   *
   * @param id - Header ID to approve
   * @throws Error if approval fails
   */
  public async approveTransaction(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.rpc('approve_transaction', {
      p_header_id: id,
      p_user_id: (await supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;
  }

  /**
   * Void a transaction via database function.
   * Marks the transaction as voided with a reason for audit purposes.
   *
   * @param id - Header ID to void
   * @param reason - Reason for voiding (required)
   * @throws Error if voiding fails
   */
  public async voidTransaction(id: string, reason: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.rpc('void_transaction', {
      p_header_id: id,
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_reason: reason
    });

    if (error) throw error;
  }

  /**
   * Get all transaction line entries for a header.
   * Includes related category, fund, account, and source data.
   *
   * @param headerId - Header ID to fetch entries for
   * @returns Array of transaction entries with related data
   */
  public async getTransactionEntries(headerId: string): Promise<any[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(
        `
        id,
        type,
        description,
        date,
        debit,
        credit,
        fund_id,
        fund:fund_id(id, name, type),
        category_id,
        category:category_id(id, name, code),
        coa_id,
        account_id,
        account:chart_of_accounts(id, code, name, account_type),
        account_holder:accounts(id, name, member_id),
        source_id,
        source:source_id(id, name, source_type)
      `
      )
      .eq('tenant_id', tenantId)
      .eq('header_id', headerId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Check if a transaction header is balanced (total debits equal total credits).
   * Uses a database function for accurate decimal comparison.
   *
   * @param headerId - Header ID to check balance for
   * @returns True if balanced, false otherwise
   */
  public async isTransactionBalanced(headerId: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('is_transaction_balanced', {
      p_header_id: headerId
    });

    if (error) throw error;
    return data;
  }

  /**
   * Create a header with its transaction lines atomically.
   * Inserts the header first, then all transaction lines.
   *
   * @param data - Header data
   * @param transactions - Array of transaction line entries
   * @returns Created header and transaction lines
   */
  public async createWithTransactions(
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }> {
    const header = await super.create(data);
    let inserted: any[] = [];
    if (transactions && transactions.length) {
      inserted = await this.insertTransactions(header.id, transactions);
    }
    return { header, transactions: inserted };
  }

  /**
   * Update a header and replace all its transaction lines.
   * Deletes existing lines and inserts new ones.
   *
   * @param id - Header ID to update
   * @param data - Header data updates
   * @param transactions - New transaction line entries (replaces existing)
   * @returns Updated header and new transaction lines
   */
  public async updateWithTransactions(
    id: string,
    data: Partial<FinancialTransactionHeader>,
    transactions: any[],
  ): Promise<{ header: FinancialTransactionHeader; transactions: any[] }> {
    const header = await super.update(id, data);
    const inserted = await this.replaceTransactions(id, transactions);
    return { header, transactions: inserted };
  }

  /**
   * Get headers that have transaction lines without proper GL mapping.
   * Used to identify incomplete journal entries.
   *
   * @returns Array of headers with unmapped transactions
   */
  public async getUnmappedHeaders(): Promise<FinancialTransactionHeader[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) return [];

    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_unmapped_headers', {
      p_tenant_id: tenantId,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Insert transaction lines for a header.
   *
   * @param headerId - Header ID to attach transactions to
   * @param entries - Transaction entries to insert
   * @returns Inserted transaction records
   */
  private async insertTransactions(headerId: string, entries: any[]): Promise<any[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');
    const supabase = await this.getSupabaseClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const rows = entries.map((e) => ({
      ...e,
      header_id: headerId,
      tenant_id: tenantId,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert(rows)
      .select();
    if (error) throw error;
    return data || [];
  }

  /**
   * Replace all transaction lines for a header.
   * Deletes existing lines and inserts new ones.
   *
   * @param headerId - Header ID to replace transactions for
   * @param entries - New transaction entries
   * @returns Inserted transaction records
   */
  private async replaceTransactions(headerId: string, entries: any[]): Promise<any[]> {
    const tenantId = await this.getTenantId();
    if (!tenantId) throw new Error('No tenant context found');
    const supabase = await this.getSupabaseClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase
      .from('financial_transactions')
      .delete()
      .eq('header_id', headerId)
      .eq('tenant_id', tenantId);
    let inserted: any[] = [];
    if (entries && entries.length) {
      const rows = entries.map((e) => ({
        ...e,
        header_id: headerId,
        tenant_id: tenantId,
        created_by: userId,
        updated_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(rows)
        .select();
      if (error) throw error;
      inserted = data || [];
    }
    return inserted;
  }

  /**
   * Get transaction summary using RPC for efficient aggregation.
   * Returns totals grouped by status and transaction type.
   *
   * @param tenantId - Tenant ID to filter by
   * @param startDate - Optional start date filter (ISO string)
   * @param endDate - Optional end date filter (ISO string)
   * @returns Array of summary rows with totals
   */
  public async getTransactionSummary(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionSummaryRow[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_transaction_summary', {
      p_tenant_id: tenantId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      throw new Error(`Failed to get transaction summary: ${error.message}`);
    }

    return (data as TransactionSummaryRow[]) || [];
  }
}