import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { ActivityLog, CreateActivityLogInput } from '@/models/activityLog.model';
import { TYPES } from '@/lib/types';
import type { IActivityLogAdapter } from '@/adapters/activityLog.adapter';

export interface IActivityLogRepository extends BaseRepository<ActivityLog> {
  createActivityLog(input: CreateActivityLogInput): Promise<void>;
}

@injectable()
export class ActivityLogRepository extends BaseRepository<ActivityLog> implements IActivityLogRepository {
  constructor(@inject(TYPES.IActivityLogAdapter) private activityLogAdapter: IActivityLogAdapter) {
    super(activityLogAdapter);
  }

  async createActivityLog(input: CreateActivityLogInput): Promise<void> {
    return this.activityLogAdapter.createActivityLog(input);
  }
}