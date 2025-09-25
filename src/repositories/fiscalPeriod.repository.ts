import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { FiscalPeriod } from '@/models/fiscalPeriod.model';
import { TYPES } from '@/lib/types';
import type { IFiscalPeriodAdapter } from '@/adapters/fiscalPeriod.adapter';

export type IFiscalPeriodRepository = BaseRepository<FiscalPeriod>;

@injectable()
export class FiscalPeriodRepository
  extends BaseRepository<FiscalPeriod>
  implements IFiscalPeriodRepository
{
  constructor(@inject(TYPES.IFiscalPeriodAdapter) adapter: IFiscalPeriodAdapter) {
    super(adapter);
  }
}
