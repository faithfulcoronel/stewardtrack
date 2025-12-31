import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type {
  NotificationPreference,
  UpsertNotificationPreferenceDto,
  DeliveryCheckResult,
} from '@/models/notification/notificationPreference.model';
import type { NotificationCategory } from '@/models/notification/notification.model';
import type { DeliveryChannelType } from '@/models/notification/notificationEvent.model';
import type { INotificationPreferenceAdapter } from '@/adapters/notificationPreference.adapter';
import { TYPES } from '@/lib/types';

export interface INotificationPreferenceRepository extends BaseRepository<NotificationPreference> {
  getUserPreferences(userId: string, tenantId: string): Promise<NotificationPreference[]>;
  getPreference(
    userId: string,
    tenantId: string,
    category: NotificationCategory | 'all',
    channel: DeliveryChannelType
  ): Promise<NotificationPreference | null>;
  upsertPreference(
    userId: string,
    tenantId: string,
    preference: UpsertNotificationPreferenceDto
  ): Promise<NotificationPreference>;
  checkShouldDeliver(
    userId: string,
    tenantId: string,
    category: NotificationCategory,
    channel: DeliveryChannelType
  ): Promise<DeliveryCheckResult>;
  resetToDefaults(userId: string, tenantId: string): Promise<void>;
}

@injectable()
export class NotificationPreferenceRepository
  extends BaseRepository<NotificationPreference>
  implements INotificationPreferenceRepository
{
  constructor(
    @inject(TYPES.INotificationPreferenceAdapter)
    private readonly preferenceAdapter: INotificationPreferenceAdapter
  ) {
    super(preferenceAdapter);
  }

  async getUserPreferences(userId: string, tenantId: string): Promise<NotificationPreference[]> {
    return this.preferenceAdapter.getUserPreferences(userId, tenantId);
  }

  async getPreference(
    userId: string,
    tenantId: string,
    category: NotificationCategory | 'all',
    channel: DeliveryChannelType
  ): Promise<NotificationPreference | null> {
    return this.preferenceAdapter.getPreference(userId, tenantId, category, channel);
  }

  async upsertPreference(
    userId: string,
    tenantId: string,
    preference: UpsertNotificationPreferenceDto
  ): Promise<NotificationPreference> {
    return this.preferenceAdapter.upsertPreference(userId, tenantId, preference);
  }

  async checkShouldDeliver(
    userId: string,
    tenantId: string,
    category: NotificationCategory,
    channel: DeliveryChannelType
  ): Promise<DeliveryCheckResult> {
    return this.preferenceAdapter.checkShouldDeliver(userId, tenantId, category, channel);
  }

  async resetToDefaults(userId: string, tenantId: string): Promise<void> {
    return this.preferenceAdapter.resetToDefaults(userId, tenantId);
  }
}
