import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { OpeningBalance } from '../../models/openingBalance.model';
import type { IOpeningBalanceAdapter } from '../openingBalance.adapter';


@injectable()
export class OpeningBalanceApiAdapter
  extends ApiBaseAdapter<OpeningBalance>
  implements IOpeningBalanceAdapter
{
  protected basePath = '/openingbalances';

  protected mapFromApi(data: any): OpeningBalance {
    return {
      id: data.id ?? data.Id,
      fiscal_year_id: data.fiscal_year_id ?? data.FiscalYearId,
      fund_id: data.fund_id ?? data.FundId,
      source_id: data.source_id ?? data.SourceId ?? null,
      amount: data.amount ?? data.Amount,
      source: data.source ?? data.Source,
      status: data.status ?? data.Status,
      header_id: data.header_id ?? data.HeaderId ?? null,
      posted_at: data.posted_at ?? data.PostedAt ?? null,
      posted_by: data.posted_by ?? data.PostedBy ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as OpeningBalance;
  }

  protected mapToApi(data: Partial<OpeningBalance>) {
    return {
      id: data.id,
      fiscalYearId: data.fiscal_year_id,
      fundId: data.fund_id,
      sourceId: data.source_id,
      amount: data.amount,
      source: data.source,
      status: data.status,
      headerId: data.header_id,
      postedAt: data.posted_at,
      postedBy: data.posted_by,
    };
  }
}
