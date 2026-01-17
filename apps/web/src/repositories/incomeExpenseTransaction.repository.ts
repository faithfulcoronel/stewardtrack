import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { IncomeExpenseTransaction } from '@/models/incomeExpenseTransaction.model';
import type { IIncomeExpenseTransactionAdapter, SourceTransaction, SourceBalance } from '@/adapters/incomeExpenseTransaction.adapter';
import { IncomeExpenseTransactionValidator } from '@/validators/incomeExpenseTransaction.validator';
import { TYPES } from '@/lib/types';

export type { SourceTransaction, SourceBalance, AllSourcesBalance, FundTransaction, FundBalance, AllFundsBalance, CategoryTransaction, CategoryBalance, AllCategoriesBalance, HeaderAmountRow } from '@/adapters/incomeExpenseTransaction.adapter';
import type { AllSourcesBalance, FundTransaction, FundBalance, AllFundsBalance, CategoryTransaction, CategoryBalance, AllCategoriesBalance, HeaderAmountRow } from '@/adapters/incomeExpenseTransaction.adapter';

export interface IIncomeExpenseTransactionRepository extends BaseRepository<IncomeExpenseTransaction> {
  getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]>;
  getHeaderAmounts(tenantId: string, headerIds?: string[]): Promise<HeaderAmountRow[]>;
  // Source methods
  getBySourceId(sourceId: string, tenantId: string): Promise<SourceTransaction[]>;
  getSourceBalance(sourceId: string, tenantId: string): Promise<SourceBalance>;
  getAllSourcesBalance(tenantId: string): Promise<AllSourcesBalance>;
  // Fund methods
  getByFundId(fundId: string, tenantId: string): Promise<FundTransaction[]>;
  getFundBalance(fundId: string, tenantId: string): Promise<FundBalance>;
  getAllFundsBalance(tenantId: string): Promise<AllFundsBalance>;
  // Category methods
  getByCategoryId(categoryId: string, tenantId: string): Promise<CategoryTransaction[]>;
  getCategoryBalance(categoryId: string, tenantId: string): Promise<CategoryBalance>;
  getAllCategoriesBalance(tenantId: string): Promise<AllCategoriesBalance>;
}

@injectable()
export class IncomeExpenseTransactionRepository
  extends BaseRepository<IncomeExpenseTransaction>
  implements IIncomeExpenseTransactionRepository
{
  constructor(
    @inject(TYPES.IIncomeExpenseTransactionAdapter)
    private readonly incomeExpenseTransactionAdapter: IIncomeExpenseTransactionAdapter
  ) {
    super(incomeExpenseTransactionAdapter);
  }

  protected override async beforeCreate(
    data: Partial<IncomeExpenseTransaction>
  ): Promise<Partial<IncomeExpenseTransaction>> {
    IncomeExpenseTransactionValidator.validate(data);
    return this.formatData(data);
  }

  protected override async afterCreate(_data: IncomeExpenseTransaction): Promise<void> {
    // Notification handled at service level
  }

  protected override async beforeUpdate(
    _id: string,
    data: Partial<IncomeExpenseTransaction>
  ): Promise<Partial<IncomeExpenseTransaction>> {
    IncomeExpenseTransactionValidator.validate(data);
    return this.formatData(data);
  }

  protected override async afterUpdate(_data: IncomeExpenseTransaction): Promise<void> {
    // Notification handled at service level
  }

  protected override async afterDelete(_id: string): Promise<void> {
    // Notification handled at service level
  }

  private formatData(
    data: Partial<IncomeExpenseTransaction>
  ): Partial<IncomeExpenseTransaction> {
    const formatted = { ...data };
    if (formatted.description) {
      formatted.description = formatted.description.trim();
    }
    if (formatted.reference) {
      formatted.reference = formatted.reference.trim();
    }
    return formatted;
  }

  public async getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]> {
    return this.incomeExpenseTransactionAdapter.getByHeaderId(headerId);
  }

  public async getHeaderAmounts(tenantId: string, headerIds?: string[]): Promise<HeaderAmountRow[]> {
    return this.incomeExpenseTransactionAdapter.getHeaderAmounts(tenantId, headerIds);
  }

  public async getBySourceId(sourceId: string, tenantId: string): Promise<SourceTransaction[]> {
    return this.incomeExpenseTransactionAdapter.getBySourceId(sourceId, tenantId);
  }

  public async getSourceBalance(sourceId: string, tenantId: string): Promise<SourceBalance> {
    return this.incomeExpenseTransactionAdapter.getSourceBalance(sourceId, tenantId);
  }

  public async getAllSourcesBalance(tenantId: string): Promise<AllSourcesBalance> {
    return this.incomeExpenseTransactionAdapter.getAllSourcesBalance(tenantId);
  }

  // Fund methods
  public async getByFundId(fundId: string, tenantId: string): Promise<FundTransaction[]> {
    return this.incomeExpenseTransactionAdapter.getByFundId(fundId, tenantId);
  }

  public async getFundBalance(fundId: string, tenantId: string): Promise<FundBalance> {
    return this.incomeExpenseTransactionAdapter.getFundBalance(fundId, tenantId);
  }

  public async getAllFundsBalance(tenantId: string): Promise<AllFundsBalance> {
    return this.incomeExpenseTransactionAdapter.getAllFundsBalance(tenantId);
  }

  // Category methods
  public async getByCategoryId(categoryId: string, tenantId: string): Promise<CategoryTransaction[]> {
    return this.incomeExpenseTransactionAdapter.getByCategoryId(categoryId, tenantId);
  }

  public async getCategoryBalance(categoryId: string, tenantId: string): Promise<CategoryBalance> {
    return this.incomeExpenseTransactionAdapter.getCategoryBalance(categoryId, tenantId);
  }

  public async getAllCategoriesBalance(tenantId: string): Promise<AllCategoriesBalance> {
    return this.incomeExpenseTransactionAdapter.getAllCategoriesBalance(tenantId);
  }
}
