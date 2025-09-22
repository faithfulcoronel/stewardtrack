import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { ErrorLog } from '@/models/errorLog.model';
import { TYPES } from '@/lib/types';

export type IErrorLogRepository = BaseRepository<ErrorLog>;

@injectable()
export class ErrorLogRepository
  extends BaseRepository<ErrorLog>
  implements IErrorLogRepository
{
  constructor(@inject(TYPES.IErrorLogAdapter) adapter: BaseAdapter<ErrorLog>) {
    super(adapter);
  }
}
