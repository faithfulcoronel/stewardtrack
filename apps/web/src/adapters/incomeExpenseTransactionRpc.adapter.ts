import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import type { TransactionType } from '@/models/financialTransaction.model';

// ============================================================================
// RPC Parameter Types
// ============================================================================

export interface CreateBatchParams {
  tenantId: string;
  transactionDate: Date | string;
  description: string;
  reference?: string | null;
  sourceId?: string | null;
  status?: 'draft' | 'posted';
  createdBy?: string | null;
  lines: CreateBatchLineParams[];
  // Extended transaction type fields
  destinationSourceId?: string | null; // For transfer transactions
  destinationFundId?: string | null; // For fund_rollover transactions
  referenceTransactionId?: string | null; // For reversal transactions
  adjustmentReason?: string | null; // For adjustment transactions
}

export interface CreateBatchLineParams {
  transaction_type: TransactionType;
  amount: number;
  description?: string;
  category_id?: string | null;
  fund_id?: string | null;
  source_id?: string | null;
  account_id?: string | null;
  batch_id?: string | null;
  line?: number | null;
  // Extended transaction type fields
  from_coa_id?: string | null; // For reclass transactions
  to_coa_id?: string | null; // For reclass transactions
}

export interface CreateBatchResult {
  header_id: string;
  header_transaction_number: string;
  header_status: string;
  lines_created: number;
  gl_entries_created: number;
}

export interface UpdateLineParams {
  tenantId: string;
  transactionId: string;
  headerUpdate?: {
    transaction_date?: string;
    description?: string;
    reference?: string;
    status?: string;
  } | null;
  lineData?: {
    transaction_type?: TransactionType;
    amount?: number;
    description?: string;
    category_id?: string | null;
    fund_id?: string | null;
    source_id?: string | null;
    account_id?: string | null;
    batch_id?: string | null;
    line?: number | null;
    isDirty?: boolean;
    isDeleted?: boolean;
  } | null;
  updatedBy?: string | null;
}

export interface UpdateLineResult {
  header_id: string | null;
  action_taken: string;
  success: boolean;
}

export interface UpdateBatchParams {
  tenantId: string;
  headerId: string;
  headerUpdate?: {
    transaction_date?: string;
    description?: string;
    reference?: string;
    status?: string;
  } | null;
  lines: UpdateBatchLineParams[];
  updatedBy?: string | null;
  // Extended transaction type fields (header-level)
  destinationSourceId?: string | null; // For transfer transactions
  destinationFundId?: string | null; // For fund_rollover transactions
  referenceTransactionId?: string | null; // For reversal transactions
  adjustmentReason?: string | null; // For adjustment transactions
}

export interface UpdateBatchLineParams {
  id?: string | null;
  transaction_type: TransactionType;
  amount: number;
  description?: string;
  category_id?: string | null;
  fund_id?: string | null;
  source_id?: string | null;
  account_id?: string | null;
  batch_id?: string | null;
  line?: number | null;
  isDirty?: boolean;
  isDeleted?: boolean;
  // Extended transaction type fields
  from_coa_id?: string | null; // For reclass transactions
  to_coa_id?: string | null; // For reclass transactions
}

export interface UpdateBatchResult {
  header_id: string;
  lines_added: number;
  lines_updated: number;
  lines_deleted: number;
  gl_entries_affected: number;
}

export interface DeleteTransactionResult {
  header_id: string | null;
  success: boolean;
}

export interface DeleteBatchResult {
  lines_deleted: number;
  gl_entries_deleted: number;
  success: boolean;
}

// ============================================================================
// Interface
// ============================================================================

export interface IIncomeExpenseTransactionRpcAdapter {
  createBatch(params: CreateBatchParams): Promise<CreateBatchResult>;
  updateLine(params: UpdateLineParams): Promise<UpdateLineResult>;
  updateBatch(params: UpdateBatchParams): Promise<UpdateBatchResult>;
  deleteTransaction(tenantId: string, transactionId: string): Promise<DeleteTransactionResult>;
  deleteBatch(tenantId: string, headerId: string): Promise<DeleteBatchResult>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class IncomeExpenseTransactionRpcAdapter implements IIncomeExpenseTransactionRpcAdapter {
  private async getSupabaseClient() {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    return await createSupabaseServerClient();
  }

  /**
   * Creates a batch of income/expense transactions with GL entries atomically.
   * Replaces ~200+ sequential database calls with a single RPC call.
   */
  public async createBatch(params: CreateBatchParams): Promise<CreateBatchResult> {
    const supabase = await this.getSupabaseClient();

    // Format date as ISO string (YYYY-MM-DD)
    const transactionDate = params.transactionDate instanceof Date
      ? params.transactionDate.toISOString().split('T')[0]
      : params.transactionDate;

    const { data, error } = await supabase.rpc('create_income_expense_batch', {
      p_tenant_id: params.tenantId,
      p_transaction_date: transactionDate,
      p_description: params.description,
      p_reference: params.reference ?? null,
      p_source_id: params.sourceId ?? null,
      p_status: params.status ?? 'draft',
      p_created_by: params.createdBy ?? null,
      p_lines: params.lines,
      // Extended transaction type parameters
      p_destination_source_id: params.destinationSourceId ?? null,
      p_destination_fund_id: params.destinationFundId ?? null,
      p_reference_transaction_id: params.referenceTransactionId ?? null,
      p_adjustment_reason: params.adjustmentReason ?? null,
    });

    if (error) {
      throw new Error(`Failed to create income/expense batch: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to create income/expense batch: no result returned');
    }

    const result = data[0] as unknown as CreateBatchResult;
    return result;
  }

  /**
   * Updates a single income/expense transaction line with its GL entries.
   * Supports isDirty (update) and isDeleted (delete) flags.
   */
  public async updateLine(params: UpdateLineParams): Promise<UpdateLineResult> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('update_income_expense_line', {
      p_tenant_id: params.tenantId,
      p_transaction_id: params.transactionId,
      p_header_update: params.headerUpdate ?? null,
      p_line_data: params.lineData ?? null,
      p_updated_by: params.updatedBy ?? null,
    });

    if (error) {
      throw new Error(`Failed to update income/expense line: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to update income/expense line: no result returned');
    }

    const result = data[0] as unknown as UpdateLineResult;
    return result;
  }

  /**
   * Updates a batch of income/expense transactions with GL entries atomically.
   * Handles add (new lines), update (isDirty), and delete (isDeleted) in a single call.
   */
  public async updateBatch(params: UpdateBatchParams): Promise<UpdateBatchResult> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('update_income_expense_batch', {
      p_tenant_id: params.tenantId,
      p_header_id: params.headerId,
      p_header_update: params.headerUpdate ?? null,
      p_lines: params.lines,
      p_updated_by: params.updatedBy ?? null,
      // Extended transaction type parameters
      p_destination_source_id: params.destinationSourceId ?? null,
      p_destination_fund_id: params.destinationFundId ?? null,
      p_reference_transaction_id: params.referenceTransactionId ?? null,
      p_adjustment_reason: params.adjustmentReason ?? null,
    });

    if (error) {
      throw new Error(`Failed to update income/expense batch: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to update income/expense batch: no result returned');
    }

    const result = data[0] as unknown as UpdateBatchResult;
    return result;
  }

  /**
   * Deletes a single income/expense transaction with its GL entries, mapping, and header.
   */
  public async deleteTransaction(tenantId: string, transactionId: string): Promise<DeleteTransactionResult> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('delete_income_expense_transaction', {
      p_tenant_id: tenantId,
      p_transaction_id: transactionId,
    });

    if (error) {
      throw new Error(`Failed to delete income/expense transaction: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to delete income/expense transaction: no result returned');
    }

    const result = data[0] as unknown as DeleteTransactionResult;
    return result;
  }

  /**
   * Deletes an entire batch (header) with all its transactions and GL entries.
   */
  public async deleteBatch(tenantId: string, headerId: string): Promise<DeleteBatchResult> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('delete_income_expense_batch', {
      p_tenant_id: tenantId,
      p_header_id: headerId,
    });

    if (error) {
      throw new Error(`Failed to delete income/expense batch: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to delete income/expense batch: no result returned');
    }

    const result = data[0] as unknown as DeleteBatchResult;
    return result;
  }
}
