import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { ChartOfAccount } from '../../models/chartOfAccount.model';
import type { IChartOfAccountAdapter } from '../chartOfAccount.adapter';
import { apiClient } from '../../lib/apiClient';

export interface IChartOfAccountApiAdapter extends ApiBaseAdapter<ChartOfAccount> {
  getHierarchy(): Promise<ChartOfAccount[]>;
}

@injectable()
export class ChartOfAccountApiAdapter
  extends ApiBaseAdapter<ChartOfAccount>
  implements IChartOfAccountAdapter
{
  protected basePath = '/chartofaccounts';

  protected mapFromApi(data: any): ChartOfAccount {
    return {
      id: data.id ?? data.Id,
      code: data.code ?? data.Code,
      name: data.name ?? data.Name,
      description: data.description ?? data.Description ?? null,
      account_type: data.account_type ?? data.AccountType,
      account_subtype: data.account_subtype ?? data.AccountSubtype ?? null,
      is_active: data.is_active ?? data.IsActive,
      parent_id: data.parent_id ?? data.ParentId ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
      parent: data.parent ?? data.Parent
        ? {
            id: data.parent?.id ?? data.Parent?.Id,
            code: data.parent?.code ?? data.Parent?.Code,
            name: data.parent?.name ?? data.Parent?.Name,
            account_type: data.parent?.account_type ?? data.Parent?.AccountType
          }
        : undefined,
      children: data.children ?? data.Children
    } as ChartOfAccount;
  }

  protected mapToApi(data: Partial<ChartOfAccount>) {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      accountType: data.account_type,
      accountSubtype: data.account_subtype,
      isActive: data.is_active,
      parentId: data.parent_id
    };
  }

  protected override async onBeforeCreate(
    data: Partial<ChartOfAccount>
  ): Promise<Partial<ChartOfAccount>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }

  async getHierarchy(): Promise<ChartOfAccount[]> {
    const result = await apiClient.get(`${this.basePath}/hierarchy`);
    return Array.isArray(result) ? result.map(r => this.mapFromApi(r)) : [];
  }
}
