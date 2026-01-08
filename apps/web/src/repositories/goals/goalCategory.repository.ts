import { injectable, inject } from 'inversify';

import type {
  GoalCategory,
  GoalCategoryCreateInput,
  GoalCategoryUpdateInput,
} from '@/models/goals';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IGoalCategoryAdapter } from '@/adapters/goals';

export interface IGoalCategoryRepository {
  getAll(): Promise<GoalCategory[]>;
  getById(id: string): Promise<GoalCategory | null>;
  getByCode(code: string): Promise<GoalCategory | null>;
  create(data: GoalCategoryCreateInput): Promise<GoalCategory>;
  update(id: string, data: GoalCategoryUpdateInput): Promise<GoalCategory>;
  delete(id: string): Promise<void>;
  isInUse(id: string): Promise<boolean>;
  seedDefaults(): Promise<void>;
}

@injectable()
export class GoalCategoryRepository implements IGoalCategoryRepository {
  constructor(
    @inject(TYPES.IGoalCategoryAdapter)
    private readonly goalCategoryAdapter: IGoalCategoryAdapter
  ) {}

  protected async afterCreate(_data: GoalCategory): Promise<void> {
    NotificationService.showSuccess('Goal category created.');
  }

  protected async afterUpdate(_data: GoalCategory): Promise<void> {
    NotificationService.showSuccess('Goal category updated.');
  }

  protected async afterDelete(): Promise<void> {
    NotificationService.showSuccess('Goal category deleted.');
  }

  async getAll(): Promise<GoalCategory[]> {
    return this.goalCategoryAdapter.findAll();
  }

  async getById(id: string): Promise<GoalCategory | null> {
    return this.goalCategoryAdapter.findById(id);
  }

  async getByCode(code: string): Promise<GoalCategory | null> {
    return this.goalCategoryAdapter.findByCode(code);
  }

  async create(data: GoalCategoryCreateInput): Promise<GoalCategory> {
    const result = await this.goalCategoryAdapter.create(data);
    await this.afterCreate(result);
    return result;
  }

  async update(id: string, data: GoalCategoryUpdateInput): Promise<GoalCategory> {
    const result = await this.goalCategoryAdapter.update(id, data);
    await this.afterUpdate(result);
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.goalCategoryAdapter.softDelete(id);
    await this.afterDelete();
  }

  async isInUse(id: string): Promise<boolean> {
    return this.goalCategoryAdapter.isInUse(id);
  }

  async seedDefaults(): Promise<void> {
    return this.goalCategoryAdapter.seedDefaults();
  }
}
