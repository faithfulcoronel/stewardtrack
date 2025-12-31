import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { IncomeExpenseTransactionMapping } from '@/models/incomeExpenseTransactionMapping.model';
import { IncomeExpenseTransactionMappingValidator } from '@/validators/incomeExpenseTransactionMapping.validator';
import type { IIncomeExpenseTransactionMappingAdapter } from '@/adapters/incomeExpenseTransactionMapping.adapter';
import { TYPES } from '@/lib/types';

export interface IIncomeExpenseTransactionMappingRepository extends BaseRepository<IncomeExpenseTransactionMapping> {
  getByTransactionId(id: string): Promise<IncomeExpenseTransactionMapping[]>;
  getByHeaderId(id: string): Promise<IncomeExpenseTransactionMapping[]>;
}

@injectable()
export class IncomeExpenseTransactionMappingRepository
  extends BaseRepository<IncomeExpenseTransactionMapping>
  implements IIncomeExpenseTransactionMappingRepository {
  constructor(
    @inject(TYPES.IIncomeExpenseTransactionMappingAdapter)
    private readonly incomeExpenseTransactionMappingAdapter: IIncomeExpenseTransactionMappingAdapter
  ) {
    super(incomeExpenseTransactionMappingAdapter);
  }

  protected override async beforeCreate(
    data: Partial<IncomeExpenseTransactionMapping>
  ): Promise<Partial<IncomeExpenseTransactionMapping>> {
    IncomeExpenseTransactionMappingValidator.validate(data);
    return data;
  }

  protected override async afterCreate(
    _data: IncomeExpenseTransactionMapping
  ): Promise<void> {
    // Notification handled at service level
  }

  protected override async beforeUpdate(
    _id: string,
    data: Partial<IncomeExpenseTransactionMapping>
  ): Promise<Partial<IncomeExpenseTransactionMapping>> {
    IncomeExpenseTransactionMappingValidator.validate(data);
    return data;
  }

  protected override async afterUpdate(
    _data: IncomeExpenseTransactionMapping
  ): Promise<void> {
    // Notification handled at service level
  }

  protected override async afterDelete(_id: string): Promise<void> {
    // Notification handled at service level
  }

  public async getByTransactionId(
    id: string
  ): Promise<IncomeExpenseTransactionMapping[]> {
    return this.incomeExpenseTransactionMappingAdapter.getByTransactionId(id);
  }

  public async getByHeaderId(
    id: string
  ): Promise<IncomeExpenseTransactionMapping[]> {
    return this.incomeExpenseTransactionMappingAdapter.getByHeaderId(id);
  }
}
