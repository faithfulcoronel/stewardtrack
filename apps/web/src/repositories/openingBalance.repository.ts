import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { OpeningBalance } from '@/models/openingBalance.model';
import { NotificationService } from '@/services/NotificationService';
import { OpeningBalanceValidator } from '@/validators/openingBalance.validator';
import { TYPES } from '@/lib/types';
import type { IOpeningBalanceAdapter } from '@/adapters/openingBalance.adapter';

export type IOpeningBalanceRepository = BaseRepository<OpeningBalance>;

@injectable()
export class OpeningBalanceRepository
  extends BaseRepository<OpeningBalance>
  implements IOpeningBalanceRepository
{
  constructor(@inject(TYPES.IOpeningBalanceAdapter) adapter: IOpeningBalanceAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<OpeningBalance>) {
    // Use validateCreate for full validation of required fields
    OpeningBalanceValidator.validateCreate(data);
    return data;
  }

  protected override async afterCreate(_data: OpeningBalance) {
    NotificationService.showSuccess('Opening balance created');
  }

  protected override async beforeUpdate(_id: string, data: Partial<OpeningBalance>) {
    // Use validateUpdate for partial updates (status changes, etc.)
    OpeningBalanceValidator.validateUpdate(data);
    return data;
  }

  protected override async afterUpdate(_data: OpeningBalance) {
    NotificationService.showSuccess('Opening balance updated');
  }
}
