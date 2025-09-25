import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { FinancialTransaction } from '@/models/financialTransaction.model';
import { FinancialTransactionValidator } from '@/validators/financialTransaction.validator';
import { TYPES } from '@/lib/types';
import type { IFinancialTransactionAdapter } from '@/adapters/financialTransaction.adapter';

export type IFinancialTransactionRepository = BaseRepository<FinancialTransaction>;

@injectable()
export class FinancialTransactionRepository
  extends BaseRepository<FinancialTransaction>
  implements IFinancialTransactionRepository
{
  constructor(
    @inject(TYPES.IFinancialTransactionAdapter) adapter: IFinancialTransactionAdapter
  ) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<FinancialTransaction>
  ): Promise<Partial<FinancialTransaction>> {
    FinancialTransactionValidator.validate(data);
    return this.formatData(data);
  }

  protected override async afterCreate(
    _data: FinancialTransaction
  ): Promise<void> {
    // Notification handled at service level
  }

  protected override async beforeUpdate(
    _id: string,
    data: Partial<FinancialTransaction>
  ): Promise<Partial<FinancialTransaction>> {
    FinancialTransactionValidator.validate(data);
    return this.formatData(data);
  }

  protected override async afterUpdate(
    _data: FinancialTransaction
  ): Promise<void> {
    // Notification handled at service level
  }

  protected override async afterDelete(_id: string): Promise<void> {
    // Notification handled at service level
  }

  private formatData(
    data: Partial<FinancialTransaction>
  ): Partial<FinancialTransaction> {
    const formatted = { ...data };
    if (formatted.description) {
      formatted.description = formatted.description.trim();
    }
    return formatted;
  }
}
