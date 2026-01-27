/**
 * Key Result Repository
 *
 * Data access interface for key result records.
 * Delegates database operations to the key result adapter.
 *
 * @module planner.core
 * @featureCode planner.core
 *
 * @permission key_results:view - Required to read key result data
 * @permission key_results:manage - Required to create/update key results
 * @permission key_results:delete - Required to delete key results
 */
import { injectable, inject } from 'inversify';

import type {
  KeyResult,
  KeyResultCreateInput,
  KeyResultUpdateInput,
  KeyResultFilters,
} from '@/models/goals';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IKeyResultAdapter } from '@/adapters/goals';

export interface IKeyResultRepository {
  getAll(filters?: KeyResultFilters): Promise<KeyResult[]>;
  getById(id: string): Promise<KeyResult | null>;
  getByGoalId(goalId: string): Promise<KeyResult[]>;
  getByObjectiveId(objectiveId: string): Promise<KeyResult[]>;
  getUpdatesDue(dueBeforeDate: string): Promise<KeyResult[]>;
  getOverdueUpdates(): Promise<KeyResult[]>;
  create(data: KeyResultCreateInput): Promise<KeyResult>;
  update(id: string, data: KeyResultUpdateInput): Promise<KeyResult>;
  updateCurrentValue(id: string, value: number): Promise<KeyResult>;
  delete(id: string): Promise<void>;
  reorder(id: string, newSortOrder: number): Promise<void>;
  markAutoUpdated(id: string, value: number): Promise<void>;
}

@injectable()
export class KeyResultRepository implements IKeyResultRepository {
  constructor(
    @inject(TYPES.IKeyResultAdapter)
    private readonly keyResultAdapter: IKeyResultAdapter
  ) {}

  protected async afterCreate(_data: KeyResult): Promise<void> {
    NotificationService.showSuccess('Key result created successfully.');
  }

  protected async afterUpdate(_data: KeyResult): Promise<void> {
    NotificationService.showSuccess('Key result updated successfully.');
  }

  protected async afterDelete(): Promise<void> {
    NotificationService.showSuccess('Key result deleted successfully.');
  }

  async getAll(filters: KeyResultFilters = {}): Promise<KeyResult[]> {
    return this.keyResultAdapter.findAll(filters);
  }

  async getById(id: string): Promise<KeyResult | null> {
    return this.keyResultAdapter.findById(id);
  }

  async getByGoalId(goalId: string): Promise<KeyResult[]> {
    return this.keyResultAdapter.findByGoalId(goalId);
  }

  async getByObjectiveId(objectiveId: string): Promise<KeyResult[]> {
    return this.keyResultAdapter.findByObjectiveId(objectiveId);
  }

  async getUpdatesDue(dueBeforeDate: string): Promise<KeyResult[]> {
    return this.keyResultAdapter.findUpdatesDue(dueBeforeDate);
  }

  async getOverdueUpdates(): Promise<KeyResult[]> {
    return this.keyResultAdapter.findOverdueUpdates();
  }

  async create(data: KeyResultCreateInput): Promise<KeyResult> {
    const result = await this.keyResultAdapter.create(data);
    await this.afterCreate(result);
    return result;
  }

  async update(id: string, data: KeyResultUpdateInput): Promise<KeyResult> {
    const result = await this.keyResultAdapter.update(id, data);
    await this.afterUpdate(result);
    return result;
  }

  async updateCurrentValue(id: string, value: number): Promise<KeyResult> {
    return this.keyResultAdapter.updateCurrentValue(id, value);
  }

  async delete(id: string): Promise<void> {
    await this.keyResultAdapter.softDelete(id);
    await this.afterDelete();
  }

  async reorder(id: string, newSortOrder: number): Promise<void> {
    await this.keyResultAdapter.reorder(id, newSortOrder);
  }

  async markAutoUpdated(id: string, value: number): Promise<void> {
    await this.keyResultAdapter.markAutoUpdated(id, value);
  }
}
