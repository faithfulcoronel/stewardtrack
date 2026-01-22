import 'server-only';
import { injectable, inject } from 'inversify';
import type { FinancialTransactionHeader, TransactionStatus } from '@/models/financialTransactionHeader.model';
import type { TransactionType } from '@/models/financialTransaction.model';
import type { IFinancialTransactionHeaderRepository } from '@/repositories/financialTransactionHeader.repository';
import type { IIncomeExpenseTransactionRepository } from '@/repositories/incomeExpenseTransaction.repository';
import type { IIncomeExpenseTransactionMappingRepository } from '@/repositories/incomeExpenseTransactionMapping.repository';
import type { IFinancialTransactionRepository } from '@/repositories/financialTransaction.repository';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { IFinancialSourceRepository } from '@/repositories/financialSource.repository';
import type { Category } from '@/models/category.model';
import type { FinancialSource } from '@/models/financialSource.model';
import type { Fund } from '@/models/fund.model';
import type { IFundRepository } from '@/repositories/fund.repository';
import type { IIncomeExpenseTransactionRpcRepository } from '@/repositories/incomeExpenseTransactionRpc.repository';
import { TYPES } from '@/lib/types';

// Feature flag for RPC usage - allows quick rollback if issues arise
const USE_RPC = process.env.NEXT_PUBLIC_USE_RPC_TRANSACTIONS !== 'false';

export interface IncomeExpenseEntry {
  id?: string;
  transaction_type: TransactionType;
  account_id: string | null;
  fund_id: string | null;
  category_id: string | null;
  source_id: string | null;
  description?: string;
  amount: number;
  source_coa_id: string | null;
  category_coa_id: string | null;
  fund_coa_id?: string | null; // Fund's equity COA (used for opening_balance transactions)
  batch_id?: string | null;
  line?: number | null;
  isDirty?: boolean;
  isDeleted?: boolean;
  // Extended transaction type fields
  destination_source_id?: string | null; // For transfer transactions
  destination_source_coa_id?: string | null; // Resolved COA for destination source
  destination_fund_id?: string | null; // For fund_rollover transactions
  destination_fund_coa_id?: string | null; // Resolved COA for destination fund
  from_coa_id?: string | null; // For reclass transactions (old account)
  to_coa_id?: string | null; // For reclass transactions (new account)
  reference_transaction_id?: string | null; // For reversal transactions
}

@injectable()
export class IncomeExpenseTransactionService {
  constructor(
    @inject(TYPES.IFinancialTransactionHeaderRepository)
    private headerRepo: IFinancialTransactionHeaderRepository,
    @inject(TYPES.IIncomeExpenseTransactionRepository)
    private ieRepo: IIncomeExpenseTransactionRepository,
    @inject(TYPES.IIncomeExpenseTransactionMappingRepository)
    private mappingRepo: IIncomeExpenseTransactionMappingRepository,
    @inject(TYPES.IFinancialTransactionRepository)
    private ftRepo: IFinancialTransactionRepository,
    @inject(TYPES.ICategoryRepository)
    private categoryRepo: ICategoryRepository,
    @inject(TYPES.IFinancialSourceRepository)
    private sourceRepo: IFinancialSourceRepository,
    @inject(TYPES.IFundRepository)
    private fundRepo: IFundRepository,
    @inject(TYPES.IIncomeExpenseTransactionRpcRepository)
    private rpcRepo: IIncomeExpenseTransactionRpcRepository,
  ) {}

  private async populateAccounts(lines: IncomeExpenseEntry[]) {
    const categoryIds = Array.from(
      new Set(lines.map(l => l.category_id).filter((id): id is string => !!id)),
    );
    const sourceIds = Array.from(
      new Set([
        ...lines.map(l => l.source_id).filter((id): id is string => !!id),
        ...lines.map(l => l.destination_source_id).filter((id): id is string => !!id),
      ]),
    );
    const fundIds = Array.from(
      new Set([
        ...lines.map(l => l.fund_id).filter((id): id is string => !!id),
        ...lines.map(l => l.destination_fund_id).filter((id): id is string => !!id),
      ]),
    );

    const categories = await Promise.all(
      categoryIds.map(id => this.categoryRepo.findById(id)),
    );
    const categoryMap = new Map(
      categories
        .filter((c): c is Category => !!c)
        .map(c => [c.id, c.chart_of_account_id ?? null]),
    );

    const sources = await Promise.all(sourceIds.map(id => this.sourceRepo.findById(id)));
    const sourceMap = new Map(
      sources
        .filter((s): s is FinancialSource => !!s)
        .map(s => [s.id, s.coa_id || null]),
    );

    const funds = await Promise.all(fundIds.map(id => this.fundRepo.findById(id)));
    const fundMap = new Map(
      funds
        .filter((f): f is Fund => !!f)
        .map(f => [f.id, f.coa_id || null]),
    );

    for (const line of lines) {
      line.category_coa_id = line.category_id
        ? categoryMap.get(line.category_id) ?? null
        : null;
      line.source_coa_id = line.source_id
        ? sourceMap.get(line.source_id) ?? null
        : null;
      line.fund_coa_id = line.fund_id
        ? fundMap.get(line.fund_id) ?? null
        : null;
      // Extended fields
      line.destination_source_coa_id = line.destination_source_id
        ? sourceMap.get(line.destination_source_id) ?? null
        : null;
      line.destination_fund_coa_id = line.destination_fund_id
        ? fundMap.get(line.destination_fund_id) ?? null
        : null;
    }
  }

  private buildTransactions(
    header: Partial<FinancialTransactionHeader>,
    line: IncomeExpenseEntry,
    headerId: string,
  ) {
    const detailDescription =
      line.description && line.description.trim()
        ? line.description.trim()
        : undefined;

    const base = {
      type: line.transaction_type,
      account_id: line.account_id,
      fund_id: line.fund_id,
      source_id: line.source_id,
      category_id: line.category_id,
      date: header.transaction_date!,
      description: detailDescription ?? header.description ?? '',
      batch_id: line.batch_id ?? null,
      header_id: headerId,
    } as any;

    switch (line.transaction_type) {
      // Income: DR Asset (source), CR Revenue (category)
      case 'income':
        return [
          { ...base, coa_id: line.source_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.category_coa_id, debit: 0, credit: line.amount },
        ];

      // Expense: DR Expense (category), CR Asset (source)
      case 'expense':
        return [
          { ...base, coa_id: line.category_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.source_coa_id, debit: 0, credit: line.amount },
        ];

      // Opening Balance: DR Asset (source), CR Equity (fund)
      case 'opening_balance':
        return [
          { ...base, coa_id: line.source_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.fund_coa_id, debit: 0, credit: line.amount },
        ];

      // Transfer: DR Asset (destination source), CR Asset (source)
      case 'transfer':
        return [
          { ...base, coa_id: line.destination_source_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.source_coa_id, debit: 0, credit: line.amount },
        ];

      // Fund Rollover: DR Equity (source fund), CR Equity (destination fund)
      case 'fund_rollover':
        return [
          { ...base, coa_id: line.fund_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.destination_fund_coa_id, debit: 0, credit: line.amount },
        ];

      // Refund: DR Revenue (category), CR Asset (source) - opposite of income
      case 'refund':
        return [
          { ...base, coa_id: line.category_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.source_coa_id, debit: 0, credit: line.amount },
        ];

      // Adjustment: Same as expense pattern (adjustable based on category type)
      case 'adjustment':
        return [
          { ...base, coa_id: line.category_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.source_coa_id, debit: 0, credit: line.amount },
        ];

      // Reclass: DR New Account (to_coa), CR Old Account (from_coa)
      case 'reclass':
        return [
          { ...base, coa_id: line.to_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.from_coa_id, debit: 0, credit: line.amount },
        ];

      // Reversal: Same as expense pattern (entries come pre-reversed)
      case 'reversal':
        return [
          { ...base, coa_id: line.category_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.source_coa_id, debit: 0, credit: line.amount },
        ];

      // Allocation: DR destination fund/expense, CR source fund/expense
      case 'allocation':
        return [
          { ...base, coa_id: line.destination_fund_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.fund_coa_id, debit: 0, credit: line.amount },
        ];

      // Closing Entry: DR Revenue / CR Retained Earnings or DR RE / CR Expense
      case 'closing_entry':
        return [
          { ...base, coa_id: line.category_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.fund_coa_id, debit: 0, credit: line.amount },
        ];

      // Default: expense pattern
      default:
        return [
          { ...base, coa_id: line.category_coa_id, debit: line.amount, credit: 0 },
          { ...base, coa_id: line.source_coa_id, debit: 0, credit: line.amount },
        ];
    }
  }

  public async getBatch(headerId: string) {
    const header = await this.headerRepo.findById(headerId);
    if (!header) return null;
    const transactions = await this.ieRepo.getByHeaderId(headerId);
    await this.populateAccounts(transactions as any);
    return { header, transactions };
  }

  private buildEntry(
    header: Partial<FinancialTransactionHeader>,
    line: IncomeExpenseEntry,
    headerId: string,
  ) {
    const detailDescription =
      line.description && line.description.trim()
        ? line.description.trim()
        : undefined;

    return {
      transaction_type: line.transaction_type,
      transaction_date: header.transaction_date!,
      amount: line.amount,
      description: detailDescription ?? header.description ?? '',
      reference: (header as any).reference ?? null,
      category_id: line.category_id,
      fund_id: line.fund_id,
      source_id: line.source_id,
      account_id: line.account_id,
      header_id: headerId,
      line: line.line ?? undefined,
      // Extended transaction type fields
      destination_source_id: line.destination_source_id ?? null,
      destination_fund_id: line.destination_fund_id ?? null,
      from_coa_id: line.from_coa_id ?? null,
      to_coa_id: line.to_coa_id ?? null,
    };
  }

  public async create(
    header: Partial<FinancialTransactionHeader>,
    lines: IncomeExpenseEntry[],
    options?: {
      destinationSourceId?: string | null;
      destinationFundId?: string | null;
      referenceTransactionId?: string | null;
      adjustmentReason?: string | null;
    },
    onProgress?: (percent: number) => void,
  ) {
    // Use RPC for batch processing (single call instead of ~200+ calls)
    if (USE_RPC) {
      const result = await this.rpcRepo.createBatch({
        tenantId: header.tenant_id!,
        transactionDate: header.transaction_date!,
        description: header.description || '',
        reference: (header as any).reference ?? null,
        sourceId: header.source_id ?? null,
        status: (header.status as 'draft' | 'posted') || 'draft',
        createdBy: header.created_by ?? null,
        // Extended transaction type fields
        destinationSourceId: options?.destinationSourceId ?? null,
        destinationFundId: options?.destinationFundId ?? null,
        referenceTransactionId: options?.referenceTransactionId ?? null,
        adjustmentReason: options?.adjustmentReason ?? null,
        lines: lines.map((line, index) => ({
          transaction_type: line.transaction_type,
          amount: line.amount,
          description: line.description,
          category_id: line.category_id,
          fund_id: line.fund_id,
          source_id: line.source_id,
          account_id: line.account_id,
          batch_id: line.batch_id,
          line: line.line ?? index + 1,
          // Extended line fields
          from_coa_id: line.from_coa_id ?? null,
          to_coa_id: line.to_coa_id ?? null,
        })),
      });

      // Report 100% completion after RPC call
      onProgress?.(100);

      // Return header-like object
      return {
        id: result.header_id,
        transaction_number: result.header_transaction_number,
        status: result.header_status as TransactionStatus,
        tenant_id: header.tenant_id,
        transaction_date: header.transaction_date,
        description: header.description,
      } as FinancialTransactionHeader;
    }

    // Legacy implementation (fallback when USE_RPC is false)
    await this.populateAccounts(lines);

    // Save the intended final status, then create header as 'draft' first
    // This allows adding transactions before marking as posted
    const finalStatus = header.status;
    const headerToCreate = { ...header, status: 'draft' as TransactionStatus };
    const headerRecord = await this.headerRepo.create(headerToCreate);

    const total = lines.length;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const [debitData, creditData] = this.buildTransactions(
        header,
        line,
        headerRecord.id,
      );

      const debitTx = await this.ftRepo.create(debitData);
      const creditTx = await this.ftRepo.create(creditData);

      const ie = await this.ieRepo.create(
        this.buildEntry(header, line, headerRecord.id),
      );

      await this.mappingRepo.create({
        transaction_id: ie.id,
        transaction_header_id: headerRecord.id,
        debit_transaction_id: debitTx.id,
        credit_transaction_id: creditTx.id,
      });

      onProgress?.(Math.round(((index + 1) / total) * 100));
    }

    // Update to final status if it was 'posted'
    if (finalStatus === 'posted') {
      await this.headerRepo.update(headerRecord.id, { status: 'posted' });
      headerRecord.status = 'posted';
    }

    return headerRecord;
  }

  public async update(
    transactionId: string,
    header: Partial<FinancialTransactionHeader>,
    line: IncomeExpenseEntry,
  ) {
    // Use RPC for single line update
    if (USE_RPC) {
      const result = await this.rpcRepo.updateLine({
        tenantId: header.tenant_id!,
        transactionId,
        headerUpdate: {
          transaction_date: header.transaction_date
            ? new Date(header.transaction_date).toISOString().split('T')[0]
            : undefined,
          description: header.description,
          reference: (header as any).reference,
          status: header.status,
        },
        lineData: {
          transaction_type: line.transaction_type,
          amount: line.amount,
          description: line.description,
          category_id: line.category_id,
          fund_id: line.fund_id,
          source_id: line.source_id,
          account_id: line.account_id,
          batch_id: line.batch_id,
          line: line.line,
          isDirty: line.isDirty,
          isDeleted: line.isDeleted,
        },
        updatedBy: header.updated_by ?? null,
      });

      if (!result.success) {
        throw new Error(`Failed to update transaction: ${result.action_taken}`);
      }

      return { id: result.header_id } as any;
    }

    // Legacy implementation (fallback when USE_RPC is false)
    await this.populateAccounts([line]);
    const mapping = (await this.mappingRepo.getByTransactionId(transactionId))[0];

    await this.headerRepo.update(mapping.transaction_header_id, header);

    if (line.isDeleted) {
      if (mapping.debit_transaction_id) {
        await this.ftRepo.delete(mapping.debit_transaction_id);
      }
      if (mapping.credit_transaction_id) {
        await this.ftRepo.delete(mapping.credit_transaction_id);
      }
      await this.ieRepo.delete(transactionId);
      await this.mappingRepo.delete(mapping.id);
      return { id: mapping.transaction_header_id } as any;
    }

    const [debitData, creditData] = this.buildTransactions(
      header,
      line,
      mapping.transaction_header_id,
    );

    if (line.isDirty) {
      if (mapping.debit_transaction_id) {
        await this.ftRepo.update(mapping.debit_transaction_id, debitData);
      }
      if (mapping.credit_transaction_id) {
        await this.ftRepo.update(mapping.credit_transaction_id, creditData);
      }

      await this.ieRepo.update(
        transactionId,
        this.buildEntry(header, line, mapping.transaction_header_id),
      );
    }

    return { id: mapping.transaction_header_id } as any;
  }

  public async updateBatch(
    headerId: string,
    header: Partial<FinancialTransactionHeader>,
    lines: IncomeExpenseEntry[],
    onProgress?: (percent: number) => void,
  ) {
    // Use RPC for batch update (single call instead of many sequential calls)
    if (USE_RPC) {
      const result = await this.rpcRepo.updateBatch({
        tenantId: header.tenant_id!,
        headerId,
        headerUpdate: {
          transaction_date: header.transaction_date
            ? new Date(header.transaction_date).toISOString().split('T')[0]
            : undefined,
          description: header.description,
          reference: (header as any).reference,
          status: header.status,
        },
        lines: lines.map((line, index) => ({
          id: line.id,
          transaction_type: line.transaction_type,
          amount: line.amount,
          description: line.description,
          category_id: line.category_id,
          fund_id: line.fund_id,
          source_id: line.source_id,
          account_id: line.account_id,
          batch_id: line.batch_id,
          line: line.line ?? index + 1,
          isDirty: line.isDirty,
          isDeleted: line.isDeleted,
        })),
        updatedBy: header.updated_by ?? null,
      });

      // Report 100% completion after RPC call
      onProgress?.(100);

      return { id: result.header_id } as any;
    }

    // Legacy implementation (fallback when USE_RPC is false)
    await this.populateAccounts(lines);
    const mappings = await this.mappingRepo.getByHeaderId(headerId);

    await this.headerRepo.update(headerId, header);

    const mappingByTxId = new Map(
      mappings.map(m => [m.transaction_id, m]),
    );
    for (const m of mappings) {
      const line = lines.find(l => l.id === m.transaction_id);
      if (!line || line.isDeleted) {
        if (m.debit_transaction_id) {
          await this.ftRepo.delete(m.debit_transaction_id);
        }
        if (m.credit_transaction_id) {
          await this.ftRepo.delete(m.credit_transaction_id);
        }
        await this.ieRepo.delete(m.transaction_id);
        await this.mappingRepo.delete(m.id);
      }
    }

    const total = lines.length;
    let processed = 0;

    for (const line of lines) {
      if (line.isDeleted) {
        processed++;
        onProgress?.(Math.round((processed / total) * 100));
        continue;
      }
      const existing = line.id ? mappingByTxId.get(line.id) : undefined;
      const [debitData, creditData] = this.buildTransactions(
        header,
        line,
        headerId,
      );

      if (existing) {
        if (line.isDirty) {
          if (existing.debit_transaction_id) {
            await this.ftRepo.update(existing.debit_transaction_id, debitData);
          }
          if (existing.credit_transaction_id) {
            await this.ftRepo.update(existing.credit_transaction_id, creditData);
          }

          await this.ieRepo.update(
            existing.transaction_id,
            this.buildEntry(header, line, headerId),
          );
        }
      } else {
        const debitTx = await this.ftRepo.create(debitData);
        const creditTx = await this.ftRepo.create(creditData);

        const ie = await this.ieRepo.create(
          this.buildEntry(header, line, headerId),
        );

        await this.mappingRepo.create({
          transaction_id: ie.id,
          transaction_header_id: headerId,
          debit_transaction_id: debitTx.id,
          credit_transaction_id: creditTx.id,
        });
      }

      processed++;
      onProgress?.(Math.round((processed / total) * 100));
    }

    return { id: headerId } as any;
  }

  public async delete(transactionId: string) {
    // Use RPC for atomic delete
    if (USE_RPC) {
      // Get tenant_id from the mapping first
      const mapping = (await this.mappingRepo.getByTransactionId(transactionId))[0];
      if (!mapping) {
        throw new Error('Transaction not found');
      }

      const header = await this.headerRepo.findById(mapping.transaction_header_id);
      if (!header) {
        throw new Error('Header not found');
      }

      const result = await this.rpcRepo.deleteTransaction(header.tenant_id!, transactionId);

      if (!result.success) {
        throw new Error('Failed to delete transaction');
      }

      return;
    }

    // Legacy implementation (fallback when USE_RPC is false)
    const mapping = (await this.mappingRepo.getByTransactionId(transactionId))[0];

    if (mapping.debit_transaction_id) {
      await this.ftRepo.delete(mapping.debit_transaction_id);
    }
    if (mapping.credit_transaction_id) {
      await this.ftRepo.delete(mapping.credit_transaction_id);
    }

    await this.headerRepo.delete(mapping.transaction_header_id);
    await this.ieRepo.delete(transactionId);
    await this.mappingRepo.delete(mapping.id);
  }

  public async deleteBatch(headerId: string) {
    // Use RPC for atomic batch delete
    if (USE_RPC) {
      const header = await this.headerRepo.findById(headerId);
      if (!header) {
        throw new Error('Header not found');
      }

      const result = await this.rpcRepo.deleteBatch(header.tenant_id!, headerId);

      if (!result.success) {
        throw new Error('Failed to delete batch');
      }

      return;
    }

    // Legacy implementation (fallback when USE_RPC is false)
    const mappings = await this.mappingRepo.getByHeaderId(headerId);

    for (const m of mappings) {
      if (m.debit_transaction_id) {
        await this.ftRepo.delete(m.debit_transaction_id);
      }
      if (m.credit_transaction_id) {
        await this.ftRepo.delete(m.credit_transaction_id);
      }
      await this.ieRepo.delete(m.transaction_id);
      await this.mappingRepo.delete(m.id);
    }

    await this.headerRepo.delete(headerId);
  }
}
