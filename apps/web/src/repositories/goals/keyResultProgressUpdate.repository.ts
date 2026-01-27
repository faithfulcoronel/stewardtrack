/**
 * Key Result Progress Update Repository
 *
 * Data access interface for progress update records.
 * Delegates database operations to the progress update adapter.
 *
 * @module planner.core
 * @featureCode planner.core
 *
 * @permission key_results:view - Required to read progress updates
 * @permission key_results:manage - Required to record progress updates
 */
import { injectable, inject } from 'inversify';

import type {
  KeyResultProgressUpdate,
  ProgressUpdateCreateInput,
  ProgressUpdateFilters,
  ProgressUpdateQueryOptions,
  ProgressHistorySummary,
} from '@/models/goals';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IKeyResultProgressUpdateAdapter } from '@/adapters/goals';

export interface IKeyResultProgressUpdateRepository {
  getAll(
    filters?: ProgressUpdateFilters,
    options?: ProgressUpdateQueryOptions
  ): Promise<{ data: KeyResultProgressUpdate[]; total: number }>;
  getById(id: string): Promise<KeyResultProgressUpdate | null>;
  getByKeyResultId(
    keyResultId: string,
    options?: ProgressUpdateQueryOptions
  ): Promise<KeyResultProgressUpdate[]>;
  create(data: ProgressUpdateCreateInput): Promise<KeyResultProgressUpdate>;
  delete(id: string): Promise<void>;
  getHistorySummary(keyResultId: string): Promise<ProgressHistorySummary>;
  getRecentUpdatesForGoal(goalId: string, limit?: number): Promise<KeyResultProgressUpdate[]>;
}

@injectable()
export class KeyResultProgressUpdateRepository implements IKeyResultProgressUpdateRepository {
  constructor(
    @inject(TYPES.IKeyResultProgressUpdateAdapter)
    private readonly progressUpdateAdapter: IKeyResultProgressUpdateAdapter
  ) {}

  protected async afterCreate(_data: KeyResultProgressUpdate): Promise<void> {
    NotificationService.showSuccess('Progress recorded successfully.');
  }

  protected async afterDelete(): Promise<void> {
    NotificationService.showSuccess('Progress update deleted.');
  }

  async getAll(
    filters: ProgressUpdateFilters = {},
    options: ProgressUpdateQueryOptions = {}
  ): Promise<{ data: KeyResultProgressUpdate[]; total: number }> {
    return this.progressUpdateAdapter.findAll(filters, options);
  }

  async getById(id: string): Promise<KeyResultProgressUpdate | null> {
    return this.progressUpdateAdapter.findById(id);
  }

  async getByKeyResultId(
    keyResultId: string,
    options: ProgressUpdateQueryOptions = {}
  ): Promise<KeyResultProgressUpdate[]> {
    return this.progressUpdateAdapter.findByKeyResultId(keyResultId, options);
  }

  async create(data: ProgressUpdateCreateInput): Promise<KeyResultProgressUpdate> {
    const result = await this.progressUpdateAdapter.create(data);
    await this.afterCreate(result);
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.progressUpdateAdapter.delete(id);
    await this.afterDelete();
  }

  async getHistorySummary(keyResultId: string): Promise<ProgressHistorySummary> {
    return this.progressUpdateAdapter.getHistorySummary(keyResultId);
  }

  async getRecentUpdatesForGoal(goalId: string, limit: number = 10): Promise<KeyResultProgressUpdate[]> {
    return this.progressUpdateAdapter.getRecentUpdatesForGoal(goalId, limit);
  }
}
