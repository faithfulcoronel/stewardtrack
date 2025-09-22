import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { FiscalPeriod } from '../models/fiscalPeriod.model';
import type { IFiscalPeriodAdapter } from '../adapters/fiscalPeriod.adapter';

export type IFiscalPeriodRepository = BaseRepository<FiscalPeriod>;

@injectable()
export class FiscalPeriodRepository
  extends BaseRepository<FiscalPeriod>
  implements IFiscalPeriodRepository
{
  constructor(@inject('IFiscalPeriodAdapter') adapter: BaseAdapter<FiscalPeriod>) {
    super(adapter);
  }
}
