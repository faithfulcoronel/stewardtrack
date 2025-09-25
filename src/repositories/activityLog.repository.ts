import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { ActivityLog } from '@/models/activityLog.model';
import { TYPES } from '@/lib/types';
import type { IActivityLogAdapter } from '@/adapters/activityLog.adapter';

export interface IActivityLogRepository extends BaseRepository<ActivityLog> {
  // Add any activity log-specific repository methods here
}

@injectable()
export class ActivityLogRepository extends BaseRepository<ActivityLog> implements IActivityLogRepository {
  constructor(@inject(TYPES.IActivityLogAdapter) adapter: IActivityLogAdapter) {
    super(adapter);
  }
}