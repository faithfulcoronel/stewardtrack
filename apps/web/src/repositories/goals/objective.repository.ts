/**
 * Objective Repository
 *
 * Data access interface for objective records.
 * Delegates database operations to the objective adapter.
 *
 * @module planner.core
 * @featureCode planner.core
 *
 * @permission objectives:view - Required to read objective data
 * @permission objectives:manage - Required to create/update objectives
 * @permission objectives:delete - Required to delete objectives
 */
import { injectable, inject } from 'inversify';

import type {
  Objective,
  ObjectiveWithKeyResults,
  ObjectiveCreateInput,
  ObjectiveUpdateInput,
  ObjectiveFilters,
} from '@/models/goals';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IObjectiveAdapter } from '@/adapters/goals';

export interface IObjectiveRepository {
  getAll(filters?: ObjectiveFilters): Promise<Objective[]>;
  getById(id: string): Promise<Objective | null>;
  getByIdWithKeyResults(id: string): Promise<ObjectiveWithKeyResults | null>;
  getByGoalId(goalId: string): Promise<Objective[]>;
  create(data: ObjectiveCreateInput): Promise<Objective>;
  update(id: string, data: ObjectiveUpdateInput): Promise<Objective>;
  delete(id: string): Promise<void>;
  reorder(id: string, newSortOrder: number): Promise<void>;
  updateProgress(id: string, progress: number): Promise<void>;
}

@injectable()
export class ObjectiveRepository implements IObjectiveRepository {
  constructor(
    @inject(TYPES.IObjectiveAdapter)
    private readonly objectiveAdapter: IObjectiveAdapter
  ) {}

  protected async afterCreate(_data: Objective): Promise<void> {
    NotificationService.showSuccess('Objective created successfully.');
  }

  protected async afterUpdate(_data: Objective): Promise<void> {
    NotificationService.showSuccess('Objective updated successfully.');
  }

  protected async afterDelete(): Promise<void> {
    NotificationService.showSuccess('Objective deleted successfully.');
  }

  async getAll(filters: ObjectiveFilters = {}): Promise<Objective[]> {
    return this.objectiveAdapter.findAll(filters);
  }

  async getById(id: string): Promise<Objective | null> {
    return this.objectiveAdapter.findById(id);
  }

  async getByIdWithKeyResults(id: string): Promise<ObjectiveWithKeyResults | null> {
    return this.objectiveAdapter.findByIdWithKeyResults(id);
  }

  async getByGoalId(goalId: string): Promise<Objective[]> {
    return this.objectiveAdapter.findByGoalId(goalId);
  }

  async create(data: ObjectiveCreateInput): Promise<Objective> {
    const result = await this.objectiveAdapter.create(data);
    await this.afterCreate(result);
    return result;
  }

  async update(id: string, data: ObjectiveUpdateInput): Promise<Objective> {
    const result = await this.objectiveAdapter.update(id, data);
    await this.afterUpdate(result);
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.objectiveAdapter.softDelete(id);
    await this.afterDelete();
  }

  async reorder(id: string, newSortOrder: number): Promise<void> {
    await this.objectiveAdapter.reorder(id, newSortOrder);
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.objectiveAdapter.updateProgress(id, progress);
  }
}
