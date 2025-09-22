import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { Fund } from '../../models/fund.model';
import type { IFundAdapter } from '../fund.adapter';
import type { FundApiRequest, FundApiResponse } from '../../types/fundApi.types';


@injectable()
export class FundApiAdapter
  extends ApiBaseAdapter<Fund, FundApiResponse, FundApiRequest>
  implements IFundAdapter
{
  protected basePath = '/funds';

  protected mapFromApi(data: FundApiResponse): Fund {
    return {
      id: data.id ?? data.Id,
      code: data.code ?? data.Code,
      name: data.name ?? data.Name,
      description: data.description ?? data.Description ?? null,
      type: data.type ?? data.Type,
      coa_id:
        data.coa_id ??
        data.CoaId ??
        data.chart_of_account_id ??
        data.ChartOfAccountId ??
        null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
      chart_of_accounts:
        data.chart_of_accounts ??
        data.ChartOfAccounts ??
        data.chart_of_account ??
        data.ChartOfAccount,
    } as Fund;
  }

  protected mapToApi(data: Partial<Fund>): FundApiRequest {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      type: data.type,
      coaId: data.coa_id,
    };
  }
}
