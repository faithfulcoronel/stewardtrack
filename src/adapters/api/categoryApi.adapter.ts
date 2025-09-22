import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { Category } from '../../models/category.model';
import type { ICategoryAdapter } from '../category.adapter';


@injectable()
export class CategoryApiAdapter
  extends ApiBaseAdapter<Category>
  implements ICategoryAdapter
{
  protected basePath = '/categories';

  protected mapFromApi(data: any): Category {
    return {
      id: data.id ?? data.Id,
      code: data.code ?? data.Code,
      name: data.name ?? data.Name,
      description: data.description ?? data.Description ?? null,
      is_system: data.is_system ?? data.IsSystem,
      is_active: data.is_active ?? data.IsActive,
      sort_order: data.sort_order ?? data.SortOrder,
      chart_of_account_id: data.chart_of_account_id ?? data.ChartOfAccountId ?? null,
      fund_id: data.fund_id ?? data.FundId ?? null,
      type: data.category_type ?? data.CategoryType ?? data.type ?? data.Type,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
      chart_of_accounts: data.chart_of_accounts ?? data.ChartOfAccounts ?? data.chart_of_account ?? data.ChartOfAccount,
      fund: data.fund ?? data.Fund
    } as Category;
  }

  protected mapToApi(data: Partial<Category>) {
    return {
      id: data.id,
      categoryType: data.type,
      code: data.code,
      name: data.name,
      description: data.description,
      chartOfAccountId: data.chart_of_account_id,
      fundId: data.fund_id,
      isSystem: data.is_system,
      isActive: data.is_active,
      sortOrder: data.sort_order
    };
  }

  protected override async onBeforeCreate(data: Partial<Category>): Promise<Partial<Category>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }
}
