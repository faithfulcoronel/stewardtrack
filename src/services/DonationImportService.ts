import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { ICategoryRepository } from '../repositories/category.repository';
import type { IFundRepository } from '../repositories/fund.repository';
import { IncomeExpenseTransactionService, IncomeExpenseEntry } from './IncomeExpenseTransactionService';
import type { FinancialTransactionHeader } from '../models/financialTransactionHeader.model';

export interface DonationImportRow {
  tenant_id: string;
  member_id: string | null;
  giving_date: string;
  categories: Record<string, number>;
}

@injectable()
export class DonationImportService {
  constructor(
    @inject(TYPES.IncomeExpenseTransactionService)
    private ieService: IncomeExpenseTransactionService,
    @inject(TYPES.ICategoryRepository)
    private categoryRepo: ICategoryRepository,
    @inject(TYPES.IFundRepository)
    private fundRepo: IFundRepository,
  ) {}

  private categoryFundMap: Record<string, string> = {
    tithe: 'TITHES_OFFERINGS',
    first_fruit_offering: 'TITHES_OFFERINGS',
    love_offering: 'TITHES_OFFERINGS',
    mission_offering: 'MISSIONS',
    mission_pledge: 'MISSIONS',
    building_offering: 'BUILDING',
    lot_offering: 'LOT',
    other_income: 'GENERAL',
  };

  private async getCategory(tenantId: string, code: string) {
    const { data } = await this.categoryRepo.find({
      filters: {
        type: { operator: 'eq', value: 'income_transaction' },
        code: { operator: 'eq', value: code },
        tenant_id: { operator: 'eq', value: tenantId },
      },
    });
    return data?.[0] || null;
  }

  private async getFund(tenantId: string, code: string) {
    const { data } = await this.fundRepo.find({
      filters: { code: { operator: 'eq', value: code }, tenant_id: { operator: 'eq', value: tenantId } },
    });
    return data?.[0] || null;
  }

  public async import(rows: DonationImportRow[]) {
    for (const row of rows) {
      for (const [code, amt] of Object.entries(row.categories)) {
        const amount = Number(amt);
        if (!amount) continue;

        const category = await this.getCategory(row.tenant_id, code);
        if (!category) continue;

        const fundCode = this.categoryFundMap[code] || 'GENERAL';
        const fund = await this.getFund(row.tenant_id, fundCode);

        const header: Partial<FinancialTransactionHeader> = {
          transaction_date: row.giving_date,
          description: 'Weekly Giving Import',
        };

        const entry: IncomeExpenseEntry = {
          transaction_type: 'income',
          member_id: row.member_id ?? null,
          accounts_account_id: null,
          fund_id: fund?.id ?? null,
          category_id: category.id,
          source_id: null,
          amount,
          source_account_id: null,
          category_account_id: category.chart_of_account_id ?? null,
        };

        await this.ieService.create(header, [entry]);
      }
    }
  }
}
