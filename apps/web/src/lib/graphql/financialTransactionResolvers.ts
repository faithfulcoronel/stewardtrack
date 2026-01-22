/**
 * GraphQL Resolvers for Financial Transaction Queries
 *
 * Implements efficient database queries with caching
 * Financial transactions consist of headers + line items (income_expense_transactions)
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IFinancialTransactionHeaderRepository } from '@/repositories/financialTransactionHeader.repository';
import type { IIncomeExpenseTransactionRepository } from '@/repositories/incomeExpenseTransaction.repository';
import type { IncomeExpenseTransactionService, IncomeExpenseEntry } from '@/services/IncomeExpenseTransactionService';
import type { IFinancialSourceRepository } from '@/repositories/financialSource.repository';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { IFundRepository } from '@/repositories/fund.repository';
import type { IAccountRepository } from '@/repositories/account.repository';
import { financialTransactionCache, EnrichedFinancialTransaction } from './financialTransactionCache';
import { tenantUtils } from '@/utils/tenantUtils';
import type { FinancialTransactionHeader, TransactionStatus } from '@/models/financialTransactionHeader.model';
import type { TransactionType } from '@/models/financialTransaction.model';

export interface SearchFinancialTransactionsArgs {
  searchTerm?: string;
  transactionType?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  sourceId?: string;
  fundId?: string;
  limit?: number;
}

export interface GetFinancialTransactionArgs {
  id: string;
}

export interface GetFinancialTransactionStatsArgs {
  startDate?: string;
  endDate?: string;
}

export interface CreateFinancialTransactionArgs {
  input: {
    transaction_type: TransactionType;
    transaction_date: string;
    description: string;
    reference?: string;
    amount: number;
    category_id: string;
    source_id: string;
    fund_id: string;
    account_id?: string;
  };
}

export interface UpdateFinancialTransactionArgs {
  id: string;
  input: {
    transaction_date?: string;
    description?: string;
    reference?: string;
    amount?: number;
    category_id?: string;
    source_id?: string;
    fund_id?: string;
    account_id?: string;
  };
}

export interface VoidFinancialTransactionArgs {
  id: string;
  reason: string;
}

/**
 * Helper function to get all financial transactions with caching
 * Fetches headers and line items, enriches with related data
 */
async function getAllFinancialTransactions(): Promise<EnrichedFinancialTransaction[]> {
  const tenantId = await tenantUtils.getTenantId();

  if (!tenantId) {
    throw new Error('No tenant context available');
  }

  // Check cache first
  const cached = financialTransactionCache.get(tenantId);
  if (cached) {
    return cached;
  }

  // Fetch all income/expense transactions (line items)
  const ieRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const headerRepo = container.get<IFinancialTransactionHeaderRepository>(TYPES.IFinancialTransactionHeaderRepository);

  const transactions = await ieRepo.findAll();
  if (!transactions.data) {
    throw new Error('Failed to retrieve financial transactions');
  }

  // Fetch headers for all transactions
  const headerIds = Array.from(new Set(transactions.data.map(t => t.header_id).filter((id): id is string => !!id)));
  const headers = await Promise.all(headerIds.map(id => headerRepo.findById(id)));
  const headerMap = new Map(headers.filter((h): h is FinancialTransactionHeader => !!h).map(h => [h.id, h]));

  // Enrich transactions with headers
  const enriched: EnrichedFinancialTransaction[] = transactions.data.map(t => ({
    ...t,
    header: t.header_id ? headerMap.get(t.header_id) : undefined,
  }));

  // Fetch and enrich with related entities (source, category, fund, account)
  const sourceRepo = container.get<IFinancialSourceRepository>(TYPES.IFinancialSourceRepository);
  const categoryRepo = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const fundRepo = container.get<IFundRepository>(TYPES.IFundRepository);
  const accountRepo = container.get<IAccountRepository>(TYPES.IAccountRepository);

  const sourceIds = Array.from(new Set(enriched.map(t => t.source_id).filter((id): id is string => !!id)));
  const categoryIds = Array.from(new Set(enriched.map(t => t.category_id).filter((id): id is string => !!id)));
  const fundIds = Array.from(new Set(enriched.map(t => t.fund_id).filter((id): id is string => !!id)));
  const accountIds = Array.from(new Set(enriched.map(t => t.account_id).filter((id): id is string => !!id)));

  const [sources, categories, funds, accounts] = await Promise.all([
    Promise.all(sourceIds.map(id => sourceRepo.findById(id))),
    Promise.all(categoryIds.map(id => categoryRepo.findById(id))),
    Promise.all(fundIds.map(id => fundRepo.findById(id))),
    Promise.all(accountIds.map(id => accountRepo.findById(id))),
  ]);

  const sourceMap = new Map(sources.filter(s => s).map(s => [s!.id, s!]));
  const categoryMap = new Map(categories.filter(c => c).map(c => [c!.id, c!]));
  const fundMap = new Map(funds.filter(f => f).map(f => [f!.id, f!]));
  const accountMap = new Map(accounts.filter(a => a).map(a => [a!.id, a!]));

  // Enrich with related entities
  enriched.forEach(t => {
    if (t.source_id) t.source = sourceMap.get(t.source_id);
    if (t.category_id) t.category = categoryMap.get(t.category_id) as any;
    if (t.fund_id) t.fund = fundMap.get(t.fund_id);
    if (t.account_id) t.account = accountMap.get(t.account_id);
  });

  // Cache the results
  financialTransactionCache.set(tenantId, enriched);

  return enriched;
}

export const financialTransactionResolvers = {
  Query: {
    /**
     * Search financial transactions with filtering
     */
    searchFinancialTransactions: async (_: any, args: SearchFinancialTransactionsArgs) => {
      const { searchTerm, transactionType, status, startDate, endDate, categoryId, sourceId, fundId, limit = 50 } = args;

      console.log(`[GraphQL] searchFinancialTransactions: term="${searchTerm}", type=${transactionType}, status=${status}`);

      let transactions = await getAllFinancialTransactions();

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase().trim();
        transactions = transactions.filter(t => {
          const desc = t.description?.toLowerCase() || '';
          const ref = t.reference?.toLowerCase() || '';
          const headerDesc = t.header?.description?.toLowerCase() || '';
          const headerNumber = t.header?.transaction_number?.toLowerCase() || '';

          return (
            desc.includes(searchLower) ||
            ref.includes(searchLower) ||
            headerDesc.includes(searchLower) ||
            headerNumber.includes(searchLower)
          );
        });
      }

      // Apply transaction type filter
      if (transactionType) {
        transactions = transactions.filter(t => t.transaction_type === transactionType);
      }

      // Apply status filter
      if (status) {
        transactions = transactions.filter(t => t.header?.status === status);
      }

      // Apply date range filter
      if (startDate) {
        transactions = transactions.filter(t => t.transaction_date >= startDate);
      }
      if (endDate) {
        transactions = transactions.filter(t => t.transaction_date <= endDate);
      }

      // Apply category filter
      if (categoryId) {
        transactions = transactions.filter(t => t.category_id === categoryId);
      }

      // Apply source filter
      if (sourceId) {
        transactions = transactions.filter(t => t.source_id === sourceId);
      }

      // Apply fund filter
      if (fundId) {
        transactions = transactions.filter(t => t.fund_id === fundId);
      }

      // Apply limit
      transactions = transactions.slice(0, limit);

      console.log(`[GraphQL] searchFinancialTransactions: found ${transactions.length} transactions`);

      // Format results
      return transactions.map(t => formatTransaction(t));
    },

    /**
     * Get a specific financial transaction by ID
     */
    getFinancialTransaction: async (_: any, args: GetFinancialTransactionArgs) => {
      const { id } = args;

      console.log(`[GraphQL] getFinancialTransaction: id=${id}`);

      // Use repository directly for single record lookup
      const ieRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
      const transaction = await ieRepo.findById(id);

      if (!transaction) {
        console.log(`[GraphQL] getFinancialTransaction: not found`);
        return null;
      }

      // Fetch header
      if (transaction.header_id) {
        const headerRepo = container.get<IFinancialTransactionHeaderRepository>(TYPES.IFinancialTransactionHeaderRepository);
        const header = await headerRepo.findById(transaction.header_id);
        if (header) {
          (transaction as EnrichedFinancialTransaction).header = header;
        }
      }

      // Fetch related entities
      const sourceRepo = container.get<IFinancialSourceRepository>(TYPES.IFinancialSourceRepository);
      const categoryRepo = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
      const fundRepo = container.get<IFundRepository>(TYPES.IFundRepository);
      const accountRepo = container.get<IAccountRepository>(TYPES.IAccountRepository);

      if (transaction.source_id) {
        transaction.source = (await sourceRepo.findById(transaction.source_id)) || undefined;
      }
      if (transaction.category_id) {
        transaction.category = (await categoryRepo.findById(transaction.category_id)) as any;
      }
      if (transaction.fund_id) {
        transaction.fund = (await fundRepo.findById(transaction.fund_id)) || undefined;
      }
      if (transaction.account_id) {
        transaction.account = (await accountRepo.findById(transaction.account_id)) || undefined;
      }

      console.log(`[GraphQL] getFinancialTransaction: found`);

      return formatTransaction(transaction as EnrichedFinancialTransaction);
    },

    /**
     * Get financial transaction statistics
     */
    getFinancialTransactionStats: async (_: any, args: GetFinancialTransactionStatsArgs) => {
      const { startDate, endDate } = args;

      console.log(`[GraphQL] getFinancialTransactionStats: startDate=${startDate}, endDate=${endDate}`);

      let transactions = await getAllFinancialTransactions();

      // Apply date filter
      if (startDate) {
        transactions = transactions.filter(t => t.transaction_date >= startDate);
      }
      if (endDate) {
        transactions = transactions.filter(t => t.transaction_date <= endDate);
      }

      // Calculate stats
      const byType = new Map<string, { count: number; total: number }>();
      const byStatus = new Map<string, number>();
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach(t => {
        // By type
        const type = t.transaction_type || 'unknown';
        const current = byType.get(type) || { count: 0, total: 0 };
        byType.set(type, { count: current.count + 1, total: current.total + t.amount });

        // By status
        const status = t.header?.status || 'draft';
        byStatus.set(status, (byStatus.get(status) || 0) + 1);

        // Income/expense totals
        if (t.transaction_type === 'income') {
          totalIncome += t.amount;
        } else if (t.transaction_type === 'expense') {
          totalExpense += t.amount;
        }
      });

      return {
        total: transactions.length,
        by_type: Array.from(byType.entries()).map(([transaction_type, data]) => ({
          transaction_type,
          count: data.count,
          total_amount: data.total,
        })),
        by_status: Array.from(byStatus.entries()).map(([status, count]) => ({
          status,
          count,
        })),
        total_income: totalIncome,
        total_expense: totalExpense,
        net_income: totalIncome - totalExpense,
      };
    },
  },

  Mutation: {
    /**
     * Create a new financial transaction
     */
    createFinancialTransaction: async (_: any, args: CreateFinancialTransactionArgs) => {
      const { input } = args;

      console.log(`[GraphQL] createFinancialTransaction: type=${input.transaction_type}, amount=${input.amount}`);

      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const transactionService = container.get<IncomeExpenseTransactionService>(TYPES.IncomeExpenseTransactionService);

      // Build header
      const header = {
        tenant_id: tenantId,
        transaction_date: input.transaction_date,
        description: input.description,
        reference: input.reference || null,
        status: 'draft' as const,
      };

      // Build line
      const line: IncomeExpenseEntry = {
        transaction_type: input.transaction_type,
        amount: input.amount,
        description: input.description,
        category_id: input.category_id,
        source_id: input.source_id,
        fund_id: input.fund_id,
        account_id: input.account_id || null,
        source_coa_id: null,
        category_coa_id: null,
      };

      // Create transaction
      const result = await transactionService.create(header, [line]);

      // Invalidate cache
      financialTransactionCache.invalidate(tenantId);

      // Fetch the created transaction with header
      const ieRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
      const transactions = await ieRepo.getByHeaderId(result.header.id);

      if (transactions.length === 0) {
        throw new Error('Failed to retrieve created transaction');
      }

      const transaction = transactions[0] as EnrichedFinancialTransaction;
      transaction.header = result.header;

      // Fetch related entities
      const sourceRepo = container.get<IFinancialSourceRepository>(TYPES.IFinancialSourceRepository);
      const categoryRepo = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
      const fundRepo = container.get<IFundRepository>(TYPES.IFundRepository);
      const accountRepo = container.get<IAccountRepository>(TYPES.IAccountRepository);

      if (transaction.source_id) {
        transaction.source = (await sourceRepo.findById(transaction.source_id)) || undefined;
      }
      if (transaction.category_id) {
        transaction.category = (await categoryRepo.findById(transaction.category_id)) as any;
      }
      if (transaction.fund_id) {
        transaction.fund = (await fundRepo.findById(transaction.fund_id)) || undefined;
      }
      if (transaction.account_id) {
        transaction.account = (await accountRepo.findById(transaction.account_id)) || undefined;
      }

      console.log(`[GraphQL] createFinancialTransaction: created transaction ${transaction.id}`);

      return formatTransaction(transaction);
    },

    /**
     * Update an existing financial transaction
     */
    updateFinancialTransaction: async (_: any, args: UpdateFinancialTransactionArgs) => {
      const { id, input } = args;

      console.log(`[GraphQL] updateFinancialTransaction: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const transactionService = container.get<IncomeExpenseTransactionService>(TYPES.IncomeExpenseTransactionService);

      // Get existing transaction
      const ieRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
      const existing = await ieRepo.findById(id);

      if (!existing) {
        throw new Error(`Transaction ${id} not found`);
      }

      // Build update line
      const line: IncomeExpenseEntry = {
        id: existing.id,
        transaction_type: existing.transaction_type,
        amount: input.amount !== undefined ? input.amount : existing.amount,
        description: input.description !== undefined ? input.description : existing.description,
        category_id: input.category_id !== undefined ? input.category_id : existing.category_id,
        source_id: input.source_id !== undefined ? input.source_id : existing.source_id,
        fund_id: input.fund_id !== undefined ? input.fund_id : existing.fund_id,
        account_id: input.account_id !== undefined ? input.account_id : existing.account_id,
        source_coa_id: null,
        category_coa_id: null,
        isDirty: true,
      };

      // Update transaction
      if (!existing.header_id) {
        throw new Error('Transaction has no header');
      }

      const result = await transactionService.update(existing.header_id, [line]);

      // Invalidate cache
      financialTransactionCache.invalidate(tenantId);

      // Return updated transaction
      const updated = await ieRepo.findById(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated transaction');
      }

      const enriched = updated as EnrichedFinancialTransaction;
      enriched.header = result.header;

      // Fetch related entities
      const sourceRepo = container.get<IFinancialSourceRepository>(TYPES.IFinancialSourceRepository);
      const categoryRepo = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
      const fundRepo = container.get<IFundRepository>(TYPES.IFundRepository);
      const accountRepo = container.get<IAccountRepository>(TYPES.IAccountRepository);

      if (enriched.source_id) {
        enriched.source = (await sourceRepo.findById(enriched.source_id)) || undefined;
      }
      if (enriched.category_id) {
        enriched.category = (await categoryRepo.findById(enriched.category_id)) as any;
      }
      if (enriched.fund_id) {
        enriched.fund = (await fundRepo.findById(enriched.fund_id)) || undefined;
      }
      if (enriched.account_id) {
        enriched.account = (await accountRepo.findById(enriched.account_id)) || undefined;
      }

      console.log(`[GraphQL] updateFinancialTransaction: updated transaction ${id}`);

      return formatTransaction(enriched);
    },

    /**
     * Submit financial transaction for approval
     */
    submitFinancialTransaction: async (_: any, args: { id: string }) => {
      const { id } = args;

      console.log(`[GraphQL] submitFinancialTransaction: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const ieRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
      const headerRepo = container.get<IFinancialTransactionHeaderRepository>(TYPES.IFinancialTransactionHeaderRepository);

      const transaction = await ieRepo.findById(id);
      if (!transaction || !transaction.header_id) {
        throw new Error(`Transaction ${id} not found`);
      }

      // Submit header
      await headerRepo.submitTransaction(transaction.header_id);

      // Invalidate cache
      financialTransactionCache.invalidate(tenantId);

      // Return updated transaction
      const updated = await ieRepo.findById(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated transaction');
      }

      const enriched = updated as EnrichedFinancialTransaction;
      enriched.header = await headerRepo.findById(transaction.header_id);

      console.log(`[GraphQL] submitFinancialTransaction: submitted transaction ${id}`);

      return formatTransaction(enriched);
    },

    /**
     * Approve financial transaction
     */
    approveFinancialTransaction: async (_: any, args: { id: string }) => {
      const { id } = args;

      console.log(`[GraphQL] approveFinancialTransaction: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const ieRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
      const headerRepo = container.get<IFinancialTransactionHeaderRepository>(TYPES.IFinancialTransactionHeaderRepository);

      const transaction = await ieRepo.findById(id);
      if (!transaction || !transaction.header_id) {
        throw new Error(`Transaction ${id} not found`);
      }

      // Approve header
      await headerRepo.approveTransaction(transaction.header_id);

      // Invalidate cache
      financialTransactionCache.invalidate(tenantId);

      // Return updated transaction
      const updated = await ieRepo.findById(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated transaction');
      }

      const enriched = updated as EnrichedFinancialTransaction;
      enriched.header = await headerRepo.findById(transaction.header_id);

      console.log(`[GraphQL] approveFinancialTransaction: approved transaction ${id}`);

      return formatTransaction(enriched);
    },

    /**
     * Post financial transaction (finalize to ledger)
     */
    postFinancialTransaction: async (_: any, args: { id: string }) => {
      const { id } = args;

      console.log(`[GraphQL] postFinancialTransaction: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const ieRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
      const headerRepo = container.get<IFinancialTransactionHeaderRepository>(TYPES.IFinancialTransactionHeaderRepository);

      const transaction = await ieRepo.findById(id);
      if (!transaction || !transaction.header_id) {
        throw new Error(`Transaction ${id} not found`);
      }

      // Post header
      await headerRepo.postTransaction(transaction.header_id);

      // Invalidate cache
      financialTransactionCache.invalidate(tenantId);

      // Return updated transaction
      const updated = await ieRepo.findById(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated transaction');
      }

      const enriched = updated as EnrichedFinancialTransaction;
      enriched.header = await headerRepo.findById(transaction.header_id);

      console.log(`[GraphQL] postFinancialTransaction: posted transaction ${id}`);

      return formatTransaction(enriched);
    },

    /**
     * Void financial transaction
     */
    voidFinancialTransaction: async (_: any, args: VoidFinancialTransactionArgs) => {
      const { id, reason } = args;

      console.log(`[GraphQL] voidFinancialTransaction: id=${id}, reason="${reason}"`);

      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const ieRepo = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
      const headerRepo = container.get<IFinancialTransactionHeaderRepository>(TYPES.IFinancialTransactionHeaderRepository);

      const transaction = await ieRepo.findById(id);
      if (!transaction || !transaction.header_id) {
        throw new Error(`Transaction ${id} not found`);
      }

      // Void header
      await headerRepo.voidTransaction(transaction.header_id, reason);

      // Invalidate cache
      financialTransactionCache.invalidate(tenantId);

      // Return updated transaction
      const updated = await ieRepo.findById(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated transaction');
      }

      const enriched = updated as EnrichedFinancialTransaction;
      enriched.header = await headerRepo.findById(transaction.header_id);

      console.log(`[GraphQL] voidFinancialTransaction: voided transaction ${id}`);

      return formatTransaction(enriched);
    },

    /**
     * Delete financial transaction (soft delete - only drafts)
     */
    deleteFinancialTransaction: async (_: any, args: { id: string }) => {
      const { id } = args;

      console.log(`[GraphQL] deleteFinancialTransaction: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const transactionService = container.get<IncomeExpenseTransactionService>(TYPES.IncomeExpenseTransactionService);

      // Delete transaction (service handles validation for draft status)
      await transactionService.delete(id);

      // Invalidate cache
      financialTransactionCache.invalidate(tenantId);

      console.log(`[GraphQL] deleteFinancialTransaction: deleted transaction ${id}`);

      return true;
    },
  },
};

/**
 * Format transaction for GraphQL response
 */
function formatTransaction(transaction: EnrichedFinancialTransaction) {
  return {
    id: transaction.id,
    tenant_id: transaction.tenant_id,
    transaction_number: transaction.header?.transaction_number || '',
    transaction_date: transaction.transaction_date,
    transaction_type: transaction.transaction_type,
    description: transaction.description,
    reference: transaction.reference || null,
    status: transaction.header?.status || 'draft',
    amount: transaction.amount,
    source_id: transaction.source_id || null,
    source: transaction.source ? {
      id: transaction.source.id,
      name: transaction.source.name,
      code: transaction.source.code || null,
      type: transaction.source.type || null,
    } : null,
    category_id: transaction.category_id || null,
    category: transaction.category ? {
      id: transaction.category.id,
      name: transaction.category.name,
      code: transaction.category.code || null,
      type: transaction.category.type || null,
    } : null,
    fund_id: transaction.fund_id || null,
    fund: transaction.fund ? {
      id: transaction.fund.id,
      name: transaction.fund.name,
      code: transaction.fund.code || null,
    } : null,
    account_id: transaction.account_id || null,
    account: transaction.account ? {
      id: transaction.account.id,
      name: transaction.account.name,
      account_number: transaction.account.account_number,
      account_type: transaction.account.account_type,
    } : null,
    submitted_at: transaction.header?.submitted_at || null,
    submitted_by: transaction.header?.submitted_by || null,
    approved_at: transaction.header?.approved_at || null,
    approved_by: transaction.header?.approved_by || null,
    posted_at: transaction.header?.posted_at || null,
    posted_by: transaction.header?.posted_by || null,
    voided_at: transaction.header?.voided_at || null,
    voided_by: transaction.header?.voided_by || null,
    void_reason: transaction.header?.void_reason || null,
    created_at: transaction.created_at,
    updated_at: transaction.updated_at,
  };
}
