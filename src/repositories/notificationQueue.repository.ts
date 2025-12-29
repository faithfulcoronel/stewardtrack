import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type {
  NotificationQueueItem,
  CreateQueueItemDto,
  QueueStatistics,
  QueueProcessingOptions,
} from '@/models/notification/notificationQueue.model';
import type { INotificationQueueAdapter } from '@/adapters/notificationQueue.adapter';
import { TYPES } from '@/lib/types';

export interface INotificationQueueRepository extends BaseRepository<NotificationQueueItem> {
  getPendingItems(options?: QueueProcessingOptions): Promise<NotificationQueueItem[]>;
  claimItem(id: string): Promise<NotificationQueueItem | null>;
  markCompleted(id: string, providerMessageId?: string): Promise<void>;
  markFailed(id: string, error: string, retryable: boolean): Promise<void>;
  markDead(id: string, error: string): Promise<void>;
  getStatistics(tenantId?: string): Promise<QueueStatistics>;
  cleanupCompleted(olderThanDays: number): Promise<number>;
  retryFailed(ids?: string[]): Promise<number>;
  enqueue(dto: CreateQueueItemDto): Promise<NotificationQueueItem>;
}

@injectable()
export class NotificationQueueRepository
  extends BaseRepository<NotificationQueueItem>
  implements INotificationQueueRepository
{
  constructor(
    @inject(TYPES.INotificationQueueAdapter)
    private readonly queueAdapter: INotificationQueueAdapter
  ) {
    super(queueAdapter);
  }

  async getPendingItems(options?: QueueProcessingOptions): Promise<NotificationQueueItem[]> {
    return this.queueAdapter.getPendingItems(options);
  }

  async claimItem(id: string): Promise<NotificationQueueItem | null> {
    return this.queueAdapter.claimItem(id);
  }

  async markCompleted(id: string, providerMessageId?: string): Promise<void> {
    return this.queueAdapter.markCompleted(id, providerMessageId);
  }

  async markFailed(id: string, error: string, retryable: boolean): Promise<void> {
    return this.queueAdapter.markFailed(id, error, retryable);
  }

  async markDead(id: string, error: string): Promise<void> {
    return this.queueAdapter.markDead(id, error);
  }

  async getStatistics(tenantId?: string): Promise<QueueStatistics> {
    return this.queueAdapter.getStatistics(tenantId);
  }

  async cleanupCompleted(olderThanDays: number): Promise<number> {
    return this.queueAdapter.cleanupCompleted(olderThanDays);
  }

  async retryFailed(ids?: string[]): Promise<number> {
    return this.queueAdapter.retryFailed(ids);
  }

  async enqueue(dto: CreateQueueItemDto): Promise<NotificationQueueItem> {
    return this.queueAdapter.create(dto as Partial<NotificationQueueItem>, dto.tenant_id);
  }
}
