import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { ErrorLog } from '../../models/errorLog.model';
import type { IErrorLogAdapter } from '../errorLog.adapter';


@injectable()
export class ErrorLogApiAdapter
  extends ApiBaseAdapter<ErrorLog>
  implements IErrorLogAdapter
{
  protected basePath = '/errorlogs';

  protected mapFromApi(data: any): ErrorLog {
    return {
      id: data.id ?? data.Id,
      message: data.message ?? data.Message,
      stack: data.stack ?? data.Stack ?? null,
      context: data.context ?? data.Context ?? null,
      tenant_id: data.tenant_id ?? data.TenantId,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as ErrorLog;
  }

  protected mapToApi(data: Partial<ErrorLog>) {
    return {
      id: data.id,
      message: data.message,
      stack: data.stack,
      context: data.context,
    };
  }
}
