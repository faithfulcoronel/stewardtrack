import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Notification } from '@/models/notification.model';
import { NotificationValidator } from '@/validators/notification.validator';
import type { INotificationAdapter } from '@/adapters/notification.adapter';
import { TYPES } from '@/lib/types';

export interface INotificationRepository
  extends BaseRepository<Notification>
{
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

@injectable()
export class NotificationRepository
  extends BaseRepository<Notification>
  implements INotificationRepository
{
  constructor(
    @inject(TYPES.INotificationAdapter)
    private readonly notificationAdapter: INotificationAdapter
  ) {
    super(notificationAdapter);
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationAdapter.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationAdapter.markAllAsRead(userId);
  }

  async deleteExpired(): Promise<void> {
    await this.notificationAdapter.deleteExpired();
  }

  protected override async beforeCreate(data: Partial<Notification>): Promise<Partial<Notification>> {
    // Validate notification data
    NotificationValidator.validate(data);

    // Set default expiration if not provided
    if (!data.expires_at) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // 30 days default
      data.expires_at = expirationDate.toISOString();
    }

    return data;
  }
}