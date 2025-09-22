import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { Budget } from '../../models/budget.model';
import type { IBudgetAdapter } from '../budget.adapter';
import type { BudgetApiResponse, BudgetApiRequest } from '../../types/budgetApi.types';

@injectable()
export class BudgetApiAdapter
  extends ApiBaseAdapter<Budget, BudgetApiResponse, BudgetApiRequest>
  implements IBudgetAdapter {
  protected basePath = '/budgets';

  protected mapFromApi(data: BudgetApiResponse): Budget {
    return {
      id: data.id ?? data.Id,
      name: data.name ?? data.Name,
      amount: data.amount ?? data.Amount,
      category_id: data.category_id ?? data.CategoryId ?? null,
      description: data.description ?? data.Description ?? null,
      start_date: data.start_date ?? data.StartDate,
      end_date: data.end_date ?? data.EndDate,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      category: data.category ?? data.Category,
    } as Budget;
  }

  protected mapToApi(data: Partial<Budget>): BudgetApiRequest {
    return {
      id: data.id,
      name: data.name,
      amount: data.amount,
      categoryId: data.category_id,
      description: data.description,
      startDate: data.start_date,
      endDate: data.end_date,
    };
  }
}
