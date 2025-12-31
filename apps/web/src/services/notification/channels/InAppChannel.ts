/**
 * ================================================================================
 * IN-APP DELIVERY CHANNEL
 * ================================================================================
 *
 * Delivers notifications to the in-app notification center.
 * Stores notifications in the database and triggers realtime updates.
 *
 * Feature Code: notifications-inapp (Essential tier)
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { INotificationRepository } from '@/repositories/notification.repository';
import type { NotificationCategory } from '@/models/notification/notification.model';
import type {
  IDeliveryChannel,
  NotificationMessage,
  DeliveryResult,
  RecipientInfo,
} from './IDeliveryChannel';
import type { DeliveryChannelType } from '@/models/notification/notificationEvent.model';

@injectable()
export class InAppChannel implements IDeliveryChannel {
  readonly channelType: DeliveryChannelType = 'in_app';
  readonly featureCode: string = 'notifications-inapp';

  constructor(
    @inject(TYPES.INotificationRepository)
    private readonly notificationRepository: INotificationRepository
  ) {}

  async isAvailable(): Promise<boolean> {
    // In-app channel is always available if the database is accessible
    return true;
  }

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    try {
      const notification = await this.notificationRepository.createNotification({
        user_id: message.recipient.userId,
        tenant_id: message.event.tenantId,
        title: message.title,
        message: message.body,
        type: this.mapPriorityToType(message.event.priority),
        category: message.event.category as NotificationCategory,
        priority: message.event.priority,
        action_type: message.metadata?.actionType as 'redirect' | 'modal' | 'none' | undefined,
        action_payload: message.metadata?.actionPayload as string | undefined,
        metadata: {
          eventId: message.event.id,
          eventType: message.event.eventType,
          correlationId: message.event.correlationId,
          ...message.metadata,
        },
        expires_at: message.event.expiresAt?.toISOString(),
      });

      return {
        success: true,
        messageId: message.id,
        providerMessageId: notification.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating in-app notification';
      return {
        success: false,
        messageId: message.id,
        error: errorMessage,
        retryable: true,
        retryAfterMs: 1000,
      };
    }
  }

  async validateRecipient(recipient: RecipientInfo): Promise<boolean> {
    // In-app notifications only require a valid user ID
    return !!recipient.userId;
  }

  private mapPriorityToType(priority: string): 'success' | 'info' | 'warning' | 'error' {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }
}
