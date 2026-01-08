import { injectable, inject } from 'inversify';

import type {
  Goal,
  GoalCreateInput,
  GoalUpdateInput,
  GoalFilters,
  GoalQueryOptions,
  GoalsDashboardStats,
  GoalActivity,
} from '@/models/goals';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IGoalAdapter } from '@/adapters/goals';

export interface IGoalRepository {
  getAll(filters?: GoalFilters, options?: GoalQueryOptions): Promise<{ data: Goal[]; total: number }>;
  getById(id: string): Promise<Goal | null>;
  create(data: GoalCreateInput): Promise<Goal>;
  update(id: string, data: GoalUpdateInput): Promise<Goal>;
  updateProgress(id: string, progress: number): Promise<void>;
  delete(id: string): Promise<void>;
  getDashboardStats(): Promise<GoalsDashboardStats>;
  getRecentActivity(limit?: number): Promise<GoalActivity[]>;
}

@injectable()
export class GoalRepository implements IGoalRepository {
  constructor(
    @inject(TYPES.IGoalAdapter)
    private readonly goalAdapter: IGoalAdapter
  ) {}

  protected async afterCreate(_data: Goal): Promise<void> {
    NotificationService.showSuccess('Goal created successfully.');
  }

  protected async afterUpdate(_data: Goal): Promise<void> {
    NotificationService.showSuccess('Goal updated successfully.');
  }

  protected async afterDelete(): Promise<void> {
    NotificationService.showSuccess('Goal deleted successfully.');
  }

  async getAll(
    filters: GoalFilters = {},
    options: GoalQueryOptions = {}
  ): Promise<{ data: Goal[]; total: number }> {
    return this.goalAdapter.findAll(filters, options);
  }

  async getById(id: string): Promise<Goal | null> {
    return this.goalAdapter.findById(id);
  }

  async create(data: GoalCreateInput): Promise<Goal> {
    const result = await this.goalAdapter.create(data);
    await this.afterCreate(result);
    return result;
  }

  async update(id: string, data: GoalUpdateInput): Promise<Goal> {
    const result = await this.goalAdapter.update(id, data);
    await this.afterUpdate(result);
    return result;
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.goalAdapter.updateProgress(id, progress);
  }

  async delete(id: string): Promise<void> {
    await this.goalAdapter.softDelete(id);
    await this.afterDelete();
  }

  async getDashboardStats(): Promise<GoalsDashboardStats> {
    return this.goalAdapter.getDashboardStats();
  }

  async getRecentActivity(limit: number = 10): Promise<GoalActivity[]> {
    return this.goalAdapter.getRecentActivity(limit);
  }
}
