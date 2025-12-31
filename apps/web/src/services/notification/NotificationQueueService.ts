import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { INotificationQueueRepository } from '@/repositories/notificationQueue.repository';
import type {
  NotificationQueueItem,
  CreateQueueItemDto,
  QueueStatistics,
  QueueProcessingOptions,
} from '@/models/notification/notificationQueue.model';

export interface INotificationQueueService {
  // Queue item operations
  enqueue(dto: CreateQueueItemDto): Promise<NotificationQueueItem>;
  getPendingItems(options?: QueueProcessingOptions): Promise<NotificationQueueItem[]>;
  claimItem(id: string): Promise<NotificationQueueItem | null>;
  markCompleted(id: string, providerMessageId?: string): Promise<void>;
  markFailed(id: string, error: string, retryable: boolean): Promise<void>;
  markDead(id: string, error: string): Promise<void>;

  // Queue management
  getStatistics(tenantId?: string): Promise<QueueStatistics>;
  cleanupCompleted(olderThanDays: number): Promise<number>;
  retryFailed(ids?: string[]): Promise<number>;
}

@injectable()
export class NotificationQueueService implements INotificationQueueService {
  constructor(
    @inject(TYPES.INotificationQueueRepository)
    private readonly queueRepository: INotificationQueueRepository
  ) {}

  async enqueue(dto: CreateQueueItemDto): Promise<NotificationQueueItem> {
    return this.queueRepository.enqueue(dto);
  }

  async getPendingItems(
    options?: QueueProcessingOptions
  ): Promise<NotificationQueueItem[]> {
    return this.queueRepository.getPendingItems(options);
  }

  async claimItem(id: string): Promise<NotificationQueueItem | null> {
    return this.queueRepository.claimItem(id);
  }

  async markCompleted(id: string, providerMessageId?: string): Promise<void> {
    return this.queueRepository.markCompleted(id, providerMessageId);
  }

  async markFailed(id: string, error: string, retryable: boolean): Promise<void> {
    return this.queueRepository.markFailed(id, error, retryable);
  }

  async markDead(id: string, error: string): Promise<void> {
    return this.queueRepository.markDead(id, error);
  }

  async getStatistics(tenantId?: string): Promise<QueueStatistics> {
    return this.queueRepository.getStatistics(tenantId);
  }

  async cleanupCompleted(olderThanDays: number): Promise<number> {
    return this.queueRepository.cleanupCompleted(olderThanDays);
  }

  async retryFailed(ids?: string[]): Promise<number> {
    return this.queueRepository.retryFailed(ids);
  }
}
