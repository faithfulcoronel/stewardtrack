import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { FiscalYear } from '../../models/fiscalYear.model';
import type { IFiscalYearAdapter } from '../fiscalYear.adapter';


@injectable()
export class FiscalYearApiAdapter
  extends ApiBaseAdapter<FiscalYear>
  implements IFiscalYearAdapter
{
  protected basePath = '/fiscalyears';

  protected mapFromApi(data: any): FiscalYear {
    return {
      id: data.id ?? data.Id,
      name: data.name ?? data.Name,
      start_date: data.start_date ?? data.StartDate,
      end_date: data.end_date ?? data.EndDate,
      status: data.status ?? data.Status,
      closed_at: data.closed_at ?? data.ClosedAt ?? null,
      closed_by: data.closed_by ?? data.ClosedBy ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as FiscalYear;
  }

  protected mapToApi(data: Partial<FiscalYear>) {
    return {
      id: data.id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status,
      closedAt: data.closed_at,
      closedBy: data.closed_by,
    };
  }
}
