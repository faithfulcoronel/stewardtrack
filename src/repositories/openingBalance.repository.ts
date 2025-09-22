import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { OpeningBalance } from '../models/openingBalance.model';
import type { IOpeningBalanceAdapter } from '../adapters/openingBalance.adapter';
import { NotificationService } from '../services/NotificationService';
import { OpeningBalanceValidator } from '../validators/openingBalance.validator';

export type IOpeningBalanceRepository = BaseRepository<OpeningBalance>;

@injectable()
export class OpeningBalanceRepository
  extends BaseRepository<OpeningBalance>
  implements IOpeningBalanceRepository
{
  constructor(@inject('IOpeningBalanceAdapter') adapter: BaseAdapter<OpeningBalance>) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<OpeningBalance>) {
    OpeningBalanceValidator.validate(data);
    return data;
  }

  protected override async afterCreate(data: OpeningBalance) {
    NotificationService.showSuccess('Opening balance created');
  }

  protected override async beforeUpdate(id: string, data: Partial<OpeningBalance>) {
    OpeningBalanceValidator.validate(data);
    return data;
  }

  protected override async afterUpdate(data: OpeningBalance) {
    NotificationService.showSuccess('Opening balance updated');
  }
}
