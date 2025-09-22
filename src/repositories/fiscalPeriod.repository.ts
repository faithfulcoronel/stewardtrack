import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { FiscalPeriod } from '@/models/fiscalPeriod.model';
import { TYPES } from '@/lib/types';

export type IFiscalPeriodRepository = BaseRepository<FiscalPeriod>;

@injectable()
export class FiscalPeriodRepository
  extends BaseRepository<FiscalPeriod>
  implements IFiscalPeriodRepository
{
  constructor(@inject(TYPES.IFiscalPeriodAdapter) adapter: BaseAdapter<FiscalPeriod>) {
    super(adapter);
  }
}
