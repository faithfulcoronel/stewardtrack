import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { FinancialSource } from '../../models/financialSource.model';
import type { IFinancialSourceAdapter } from '../financialSource.adapter';

const sourceTypeMap: Record<number, FinancialSource['source_type']> = {
  0: 'bank',
  1: 'fund',
  2: 'wallet',
  3: 'cash',
  4: 'online',
  5: 'other',
};

const sourceTypeReverseMap: Record<FinancialSource['source_type'], number> = {
  bank: 0,
  fund: 1,
  wallet: 2,
  cash: 3,
  online: 4,
  other: 5,
};


@injectable()
export class FinancialSourceApiAdapter
  extends ApiBaseAdapter<FinancialSource>
  implements IFinancialSourceAdapter
{
  protected basePath = '/financialsources';

  protected mapFromApi(data: any): FinancialSource {
    return {
      id: data.id ?? data.Id,
      name: data.name ?? data.Name,
      description: data.description ?? data.Description ?? null,
      source_type:
        typeof (data.source_type ?? data.SourceType) === 'number'
          ? sourceTypeMap[data.source_type ?? data.SourceType]
          : data.source_type ?? data.SourceType,
      account_number: data.account_number ?? data.AccountNumber ?? null,
      coa_id: data.coa_id ?? data.CoaId ?? null,
      is_active: data.is_active ?? data.IsActive,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as FinancialSource;
  }

  protected mapToApi(data: Partial<FinancialSource>) {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      sourceType:
        typeof data.source_type === 'string'
          ? sourceTypeReverseMap[data.source_type]
          : data.source_type,
      accountNumber: data.account_number,
      coaId: data.coa_id,
      isActive: data.is_active,
    };
  }
}
