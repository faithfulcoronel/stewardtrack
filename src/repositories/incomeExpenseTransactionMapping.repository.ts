import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { IncomeExpenseTransactionMapping } from '../models/incomeExpenseTransactionMapping.model';
import type { IIncomeExpenseTransactionMappingAdapter } from '../adapters/incomeExpenseTransactionMapping.adapter';
import { NotificationService } from '../services/NotificationService';
import { IncomeExpenseTransactionMappingValidator } from '../validators/incomeExpenseTransactionMapping.validator';

export interface IIncomeExpenseTransactionMappingRepository extends BaseRepository<IncomeExpenseTransactionMapping> {
  getByTransactionId(id: string): Promise<IncomeExpenseTransactionMapping[]>;
  getByHeaderId(id: string): Promise<IncomeExpenseTransactionMapping[]>;
}

@injectable()
export class IncomeExpenseTransactionMappingRepository
  extends BaseRepository<IncomeExpenseTransactionMapping>
  implements IIncomeExpenseTransactionMappingRepository {
  constructor(
    @inject('IIncomeExpenseTransactionMappingAdapter')
    adapter: BaseAdapter<IncomeExpenseTransactionMapping>
  ) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<IncomeExpenseTransactionMapping>
  ): Promise<Partial<IncomeExpenseTransactionMapping>> {
    IncomeExpenseTransactionMappingValidator.validate(data);
    return data;
  }

  protected override async afterCreate(
    data: IncomeExpenseTransactionMapping
  ): Promise<void> {
    // Notification handled at service level
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<IncomeExpenseTransactionMapping>
  ): Promise<Partial<IncomeExpenseTransactionMapping>> {
    IncomeExpenseTransactionMappingValidator.validate(data);
    return data;
  }

  protected override async afterUpdate(
    data: IncomeExpenseTransactionMapping
  ): Promise<void> {
    // Notification handled at service level
  }

  protected override async afterDelete(id: string): Promise<void> {
    // Notification handled at service level
  }

  public async getByTransactionId(
    id: string
  ): Promise<IncomeExpenseTransactionMapping[]> {
    return (
      this.adapter as unknown as IIncomeExpenseTransactionMappingAdapter
    ).getByTransactionId(id);
  }

  public async getByHeaderId(
    id: string
  ): Promise<IncomeExpenseTransactionMapping[]> {
    return (
      this.adapter as unknown as IIncomeExpenseTransactionMappingAdapter
    ).getByHeaderId(id);
  }
}
