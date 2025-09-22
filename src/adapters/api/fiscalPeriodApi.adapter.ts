import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { FiscalPeriod } from '../../models/fiscalPeriod.model';
import type { IFiscalPeriodAdapter } from '../fiscalPeriod.adapter';


@injectable()
export class FiscalPeriodApiAdapter
  extends ApiBaseAdapter<FiscalPeriod>
  implements IFiscalPeriodAdapter
{
  protected basePath = '/fiscalperiods';

  protected mapFromApi(data: any): FiscalPeriod {
    return {
      id: data.id ?? data.Id,
      tenant_id: data.tenant_id ?? data.TenantId,
      fiscal_year_id: data.fiscal_year_id ?? data.FiscalYearId,
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
    } as FiscalPeriod;
  }

  protected mapToApi(data: Partial<FiscalPeriod>) {
    return {
      id: data.id,
      fiscalYearId: data.fiscal_year_id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status,
      closedAt: data.closed_at,
      closedBy: data.closed_by,
    };
  }
}
