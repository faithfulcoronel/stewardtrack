import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { FiscalYear } from '@/models/fiscalYear.model';
import { NotificationService } from '@/services/NotificationService';
import { FiscalYearValidator } from '@/validators/fiscalYear.validator';
import { TYPES } from '@/lib/types';

export type IFiscalYearRepository = BaseRepository<FiscalYear>;

@injectable()
export class FiscalYearRepository
  extends BaseRepository<FiscalYear>
  implements IFiscalYearRepository
{
  constructor(@inject(TYPES.IFiscalYearAdapter) adapter: BaseAdapter<FiscalYear>) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<FiscalYear>) {
    FiscalYearValidator.validate(data);
    return data;
  }

  protected override async afterCreate(data: FiscalYear) {
    NotificationService.showSuccess(`Fiscal year "${data.name}" created`);
  }

  protected override async beforeUpdate(id: string, data: Partial<FiscalYear>) {
    FiscalYearValidator.validate(data);
    return data;
  }

  protected override async afterUpdate(data: FiscalYear) {
    NotificationService.showSuccess(`Fiscal year "${data.name}" updated`);
  }
}
