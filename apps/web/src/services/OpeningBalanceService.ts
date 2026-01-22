import 'server-only';
import { injectable, inject } from 'inversify';
import type { IOpeningBalanceRepository } from '@/repositories/openingBalance.repository';
import type { IFundRepository } from '@/repositories/fund.repository';
import type { IAccountRepository } from '@/repositories/account.repository';
import { IncomeExpenseTransactionService, type IncomeExpenseEntry } from './IncomeExpenseTransactionService';
import { TYPES } from '@/lib/types';
import type { OpeningBalance } from '@/models/openingBalance.model';

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
    @inject(TYPES.IFundRepository)
    private fundRepo: IFundRepository,
    @inject(TYPES.IAccountRepository)
    private accountRepo: IAccountRepository,
    @inject(TYPES.IncomeExpenseTransactionService)
    private ieService: IncomeExpenseTransactionService,
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

    if (!fund?.coa_id) {
      throw new Error('Fund missing equity account');
    }

    // Get tenant_id from the fund (all tenant-scoped entities have tenant_id)
    const tenantId = fund.tenant_id;
    if (!tenantId) {
      throw new Error('Unable to determine tenant context from fund');
    }

    // Look up the organization account for this tenant
    const { data: orgAccounts } = await this.accountRepo.find({
      filters: {
        tenant_id: { operator: 'eq', value: tenantId },
        account_type: { operator: 'eq', value: 'organization' },
      },
    });

    if (!orgAccounts || orgAccounts.length === 0) {
      throw new Error(
        'No organization account found for this tenant. Please ensure the church account is created during onboarding.'
      );
    }

    const accountId = orgAccounts[0].id;

    // Build the opening balance entry for the unified transaction service
    const entry: IncomeExpenseEntry = {
      transaction_type: 'opening_balance',
      account_id: accountId,
      fund_id: balance.fund_id,
      source_id: balance.source_id,
      category_id: null,
      amount: balance.amount,
      source_coa_id: null, // Will be populated by the service
      category_coa_id: null,
      fund_coa_id: null, // Will be populated by the service
      description: 'Opening Balance',
    };

    // Use the unified income/expense transaction service to create journal entries
    const header = await this.ieService.create(
      {
        transaction_date:
          (balance.fiscal_year as any)?.start_date ??
          new Date().toISOString().slice(0, 10),
        description: 'Opening Balance',
        status: 'posted',
        source_id: balance.source_id ?? null,
      },
      [entry]
    );

    await this.obRepo.update(id, {
      status: 'posted',
      header_id: header.id,
      posted_at: new Date().toISOString(),
    });
  }
}
