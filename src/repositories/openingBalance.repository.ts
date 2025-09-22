import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { OpeningBalance } from '@/models/openingBalance.model';
import { NotificationService } from '@/services/NotificationService';
import { OpeningBalanceValidator } from '@/validators/openingBalance.validator';
import { TYPES } from '@/lib/types';

export type IOpeningBalanceRepository = BaseRepository<OpeningBalance>;

@injectable()
export class OpeningBalanceRepository
  extends BaseRepository<OpeningBalance>
  implements IOpeningBalanceRepository
{
  constructor(@inject(TYPES.IOpeningBalanceAdapter) adapter: BaseAdapter<OpeningBalance>) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<OpeningBalance>) {
    OpeningBalanceValidator.validate(data);
    return data;
  }

  protected override async afterCreate(_data: OpeningBalance) {
    NotificationService.showSuccess('Opening balance created');
  }

  protected override async beforeUpdate(_id: string, data: Partial<OpeningBalance>) {
    OpeningBalanceValidator.validate(data);
    return data;
  }

  protected override async afterUpdate(_data: OpeningBalance) {
    NotificationService.showSuccess('Opening balance updated');
  }
}
