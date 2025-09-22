import { injectable, inject } from 'inversify';
import type { IOpeningBalanceRepository } from '../repositories/openingBalance.repository';
import type { IFinancialTransactionHeaderRepository } from '../repositories/financialTransactionHeader.repository';
import type { IFinancialTransactionRepository } from '../repositories/financialTransaction.repository';

import type { IFundRepository } from '../repositories/fund.repository';
import type { IFinancialSourceRepository } from '../repositories/financialSource.repository';
import { TYPES } from '../lib/types';
import type { OpeningBalance } from '../models/openingBalance.model';

export interface OpeningBalanceEntry {
  fund_id: string;
  amount: number;
  source_id: string | null;
}

@injectable()
export class OpeningBalanceService {
  constructor(
    @inject(TYPES.IOpeningBalanceRepository)
    private obRepo: IOpeningBalanceRepository,
    @inject(TYPES.IFinancialTransactionHeaderRepository)
    private headerRepo: IFinancialTransactionHeaderRepository,
    @inject(TYPES.IFinancialTransactionRepository)
    private ftRepo: IFinancialTransactionRepository,
    @inject(TYPES.IFundRepository)
    private fundRepo: IFundRepository,
    @inject(TYPES.IFinancialSourceRepository)
    private sourceRepo: IFinancialSourceRepository,
  ) {}

  async createBatch(
    fiscalYearId: string,
    entries: OpeningBalanceEntry[],
  ): Promise<OpeningBalance[]> {
    const records: OpeningBalance[] = [] as OpeningBalance[];
    for (const entry of entries) {
      const rec = await this.obRepo.create({
        fiscal_year_id: fiscalYearId,
        fund_id: entry.fund_id,
        source_id: entry.source_id,
        amount: entry.amount,
        source: 'manual',
        status: 'draft',
      });
      records.push(rec);
    }
    return records;
  }

  async submit(id: string) {
    await this.obRepo.update(id, { status: 'submitted' });
  }

  async approve(id: string) {
    await this.obRepo.update(id, { status: 'approved' });
  }

  async void(id: string) {
    await this.obRepo.update(id, { status: 'voided' });
  }

  async post(id: string) {
    const balance = await this.obRepo.findById(id);
    if (!balance) throw new Error('Opening balance not found');
    if (balance.status !== 'approved') {
      throw new Error('Only approved balances can be posted');
    }
    if (!balance.fund_id) throw new Error('Fund required');
    if (!balance.source_id) throw new Error('Financial source required');

    const fund = await this.fundRepo.findById(balance.fund_id);
    const source = await this.sourceRepo.findById(balance.source_id);

    if (!fund?.coa_id) {
      throw new Error('Fund missing equity account');
    }
    if (!source?.coa_id) {
      throw new Error('Financial source missing asset account');
    }

    const header = await this.headerRepo.create({
      transaction_date:
        (balance.fiscal_year as any)?.start_date ??
        new Date().toISOString().slice(0, 10),
      description: 'Opening Balance',
      status: 'posted',
      source_id: balance.source_id ?? null,
    });

    await this.ftRepo.create({
      header_id: header.id,
      account_id: source.coa_id,
      fund_id: balance.fund_id,
      type: 'opening_balance',
      date: header.transaction_date,
      description: 'Opening Balance',
      debit: balance.amount,
      credit: 0,
    });
    await this.ftRepo.create({
      header_id: header.id,
      account_id: fund.coa_id,
      fund_id: balance.fund_id,
      type: 'opening_balance',
      date: header.transaction_date,
      description: 'Opening Balance',
      debit: 0,
      credit: balance.amount,
    });

    await this.obRepo.update(id, {
      status: 'posted',
      header_id: header.id,
      posted_at: new Date().toISOString(),
    });
  }
}
