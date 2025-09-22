import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { IncomeExpenseTransaction } from '@/models/incomeExpenseTransaction.model';
import type { IIncomeExpenseTransactionAdapter } from '@/adapters/incomeExpenseTransaction.adapter';
import { IncomeExpenseTransactionValidator } from '@/validators/incomeExpenseTransaction.validator';
import { TYPES } from '@/lib/types';

export interface IIncomeExpenseTransactionRepository extends BaseRepository<IncomeExpenseTransaction> {
  getByHeaderId(headerId: string): Promise<IncomeExpenseTransaction[]>;
}

@injectable()
export class IncomeExpenseTransactionRepository
  extends BaseRepository<IncomeExpenseTransaction>
  implements IIncomeExpenseTransactionRepository
{
  constructor(
    @inject(TYPES.IIncomeExpenseTransactionAdapter) adapter: BaseAdapter<IncomeExpenseTransaction>
  ) {
    super(adapter);
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
    return (
      this.adapter as unknown as IIncomeExpenseTransactionAdapter
    ).getByHeaderId(headerId);
  }
}
