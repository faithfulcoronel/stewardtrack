import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFinancialTransactionRepository } from '@/repositories/financialTransaction.repository';
import type { IFinancialTransactionHeaderRepository } from '@/repositories/financialTransactionHeader.repository';
import type { IIncomeExpenseTransactionMappingRepository } from '@/repositories/incomeExpenseTransactionMapping.repository';
import type { IIncomeExpenseTransactionRepository } from '@/repositories/incomeExpenseTransaction.repository';
import type {
  FinancialTransaction,
  TransactionType,
} from '@/models/financialTransaction.model';
import type { FinancialTransactionHeader } from '@/models/financialTransactionHeader.model';
import type { IncomeExpenseTransaction } from '@/models/incomeExpenseTransaction.model';

export interface UnmappedTransactionSet {
  header: FinancialTransactionHeader;
  transaction: IncomeExpenseTransaction;
}

@injectable()
export class DataFixService {
  constructor(
    @inject(TYPES.IFinancialTransactionRepository)
    private ftRepo: IFinancialTransactionRepository,
    @inject(TYPES.IFinancialTransactionHeaderRepository)
    private headerRepo: IFinancialTransactionHeaderRepository,
    @inject(TYPES.IIncomeExpenseTransactionMappingRepository)
    private mappingRepo: IIncomeExpenseTransactionMappingRepository,
    @inject(TYPES.IIncomeExpenseTransactionRepository)
    private ieRepo: IIncomeExpenseTransactionRepository,
  ) {}

  /**
   * Find income/expense transactions that do not have a corresponding
   * mapping record linking them to double entry transactions.
   */
  async findUnmappedTransactions(): Promise<UnmappedTransactionSet[]> {
    const headers = await this.headerRepo.getUnmappedHeaders();
    const result: UnmappedTransactionSet[] = [];

    for (const header of headers) {
      const transactions = await this.ieRepo.getByHeaderId(header.id);
      for (const tx of transactions) {
        result.push({ header, transaction: tx });
      }
    }

    return result;
  }

  /**
   * Create mapping rows for all income/expense transactions that lack them.
   * Attempts to locate the corresponding debit and credit transactions based
   * on shared header and detail attributes.
   */
  async fixMappings(headerIds?: string[]): Promise<void> {
    let headers = await this.headerRepo.getUnmappedHeaders();
    if (headerIds && headerIds.length > 0) {
      headers = headers.filter(h => headerIds.includes(h.id));
    }
    if (headers.length === 0) return;

    const { data: existing } = await this.mappingRepo.findAll();
    const usedIds = new Set(
      existing
        .flatMap(m => [m.debit_transaction_id, m.credit_transaction_id])
        .filter(Boolean) as string[],
    );

    for (const header of headers) {
      const transactions = await this.ieRepo.getByHeaderId(header.id);

      if (transactions.length === 0) {
        const { data: fts } = await this.ftRepo.findAll({
          filters: { header_id: { operator: 'eq', value: header.id } },
          order: { column: 'created_at', ascending: true },
        });

        const debits = fts.filter(
          t => !usedIds.has(t.id) && (t.debit || 0) > 0,
        );
        const credits = fts.filter(
          t => !usedIds.has(t.id) && (t.credit || 0) > 0,
        );
        const count = Math.min(debits.length, credits.length);

        for (let i = 0; i < count; i++) {
          const debit = debits[i];
          const credit = credits[i];

          const description =
            debit.description || credit.description || header.description || '';

          const txType: TransactionType =
            debit.source_id && credit.category_id
              ? 'income'
              : debit.category_id && credit.source_id
              ? 'expense'
              : ((debit.type || credit.type || 'income') as TransactionType);

          await this.ftRepo.update(debit.id, { type: txType });
          await this.ftRepo.update(credit.id, { type: txType });

          const ie = await this.ieRepo.create({
            transaction_type: txType as any,
            transaction_date: header.transaction_date,
            amount: Math.abs(debit.debit || credit.credit || 0),
            description,
            reference: header.reference ?? null,
            member_id:
              debit.account_holder?.member_id ??
              credit.account_holder?.member_id ??
              null,
            category_id: debit.category_id ?? credit.category_id ?? null,
            fund_id: debit.fund_id ?? credit.fund_id ?? null,
            source_id: debit.source_id ?? credit.source_id ?? null,
            account_id: debit.account_id ?? credit.account_id ?? null,
            header_id: header.id,
            line: i + 1,
          });

          await this.mappingRepo.create({
            transaction_id: ie.id,
            transaction_header_id: header.id,
            debit_transaction_id: debit.id,
            credit_transaction_id: credit.id,
          });

          usedIds.add(debit.id);
          usedIds.add(credit.id);
        }
        continue;
      }

      for (const ie of transactions) {
        const filters: Record<string, any> = {
          header_id: { operator: 'eq', value: header.id },
        };
        if (ie.account_id) {
          filters.account_id = {
            operator: 'eq',
            value: ie.account_id,
          };
        }
        if (ie.fund_id) {
          filters.fund_id = { operator: 'eq', value: ie.fund_id };
        }
        if (ie.source_id) {
          filters.source_id = { operator: 'eq', value: ie.source_id };
        }
        if (ie.category_id) {
          filters.category_id = { operator: 'eq', value: ie.category_id };
        }
        const { data: fts } = await this.ftRepo.findAll({
          filters,
          order: { column: 'created_at', ascending: true },
        });

        const candidates = fts.filter(tx => !usedIds.has(tx.id));
        if (candidates.length < 2) continue;

        const debit = candidates.find(t => (t.debit || 0) > 0) as
          | FinancialTransaction
          | undefined;
        const credit = candidates.find(
          t => (t.credit || 0) > 0 && t !== debit,
        ) as FinancialTransaction | undefined;

        if (!debit || !credit) continue;

        const txType: TransactionType =
          debit.source_id && credit.category_id
            ? 'income'
            : debit.category_id && credit.source_id
            ? 'expense'
            : ((debit.type || credit.type || ie.transaction_type) as TransactionType);

        await this.ftRepo.update(debit.id, { type: txType });
        await this.ftRepo.update(credit.id, { type: txType });

        await this.mappingRepo.create({
          transaction_id: ie.id,
          transaction_header_id: header.id,
          debit_transaction_id: debit.id,
          credit_transaction_id: credit.id,
        });

        usedIds.add(debit.id);
        usedIds.add(credit.id);
      }
    }
  }

  /**
   * Manually pair a debit and credit transaction and create the
   * corresponding income/expense entry and mapping record.
   */
  async pairTransactions(
    header: FinancialTransactionHeader,
    debit: FinancialTransaction,
    credit: FinancialTransaction,
    overrides?: Partial<IncomeExpenseTransaction>,
  ): Promise<void> {
    const existing = await this.mappingRepo.getByHeaderId(header.id);
    const description =
      overrides?.description ??
      (debit.description || credit.description || header.description || '');

    const txType: TransactionType =
      debit.source_id && credit.category_id
        ? 'income'
        : debit.category_id && credit.source_id
        ? 'expense'
        : ((debit.type || credit.type || 'income') as TransactionType);

    await this.ftRepo.update(debit.id, { type: txType });
    await this.ftRepo.update(credit.id, { type: txType });

    const ie = await this.ieRepo.create({
      transaction_type: txType as any,
      transaction_date: header.transaction_date,
      amount: overrides?.amount ?? Math.abs(debit.debit || credit.credit || 0),
      description,
      reference: header.reference ?? null,
      member_id:
        overrides?.member_id ??
        debit.account_holder?.member_id ??
        credit.account_holder?.member_id ??
        null,
      category_id:
        overrides?.category_id ??
        debit.category_id ??
        credit.category_id ??
        null,
      fund_id:
        overrides?.fund_id ?? debit.fund_id ?? credit.fund_id ?? null,
      source_id:
        overrides?.source_id ?? debit.source_id ?? credit.source_id ?? null,
      account_id:
        overrides?.account_id ??
        debit.account_id ??
        credit.account_id ??
        null,
      header_id: header.id,
      line: existing.length + 1,
    });

    await this.mappingRepo.create({
      transaction_id: ie.id,
      transaction_header_id: header.id,
      debit_transaction_id: debit.id,
      credit_transaction_id: credit.id,
    });
  }
}

