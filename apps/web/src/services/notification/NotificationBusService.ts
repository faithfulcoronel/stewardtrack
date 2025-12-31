/**
 * ================================================================================
 * NOTIFICATION BUS SERVICE
 * ================================================================================
 *
 * The main orchestrator for the notification system. Implements the Service Bus
 * pattern for multi-channel notification delivery.
 *
 * Responsibilities:
 * 1. Accept notification events from domain services
 * 2. Queue events for reliable delivery
 * 3. Dispatch events to appropriate channels via ChannelDispatcher
 * 4. Handle retries for failed deliveries
 * 5. Track delivery status
 *
 * Usage:
 *   const bus = container.get<NotificationBusService>(TYPES.NotificationBusService);
 *   await bus.publish({
 *     id: uuid(),
 *     eventType: NotificationEventType.MEMBER_INVITED,
 *     category: 'member',
 *     priority: 'normal',
 *     tenantId: 'xxx',
 *     recipient: { userId: 'yyy', email: 'user@example.com' },
 *     payload: { memberName: 'John Doe' },
 *   });
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { INotificationQueueService } from './NotificationQueueService';
import type { ChannelDispatcher, EventDispatchResult } from './ChannelDispatcher';
import type {
  NotificationEvent,
  NotificationPublishResult,
  ChannelDispatchResult,
} from '@/models/notification/notificationEvent.model';
import type { InAppChannel } from './channels/InAppChannel';
import type { EmailChannel } from './channels/EmailChannel';
import type { SmsChannel } from './channels/SmsChannel';
import type { PushChannel } from './channels/PushChannel';
import type { WebhookChannel } from './channels/WebhookChannel';

export interface INotificationBusService {
  /**
   * Publish a notification event for multi-channel delivery
   */
  publish(event: NotificationEvent): Promise<NotificationPublishResult>;

  /**
   * Process pending items in the notification queue
   */
  processQueue(batchSize?: number): Promise<void>;

  /**
   * Retry failed notifications
   */
  retryFailed(ids?: string[]): Promise<number>;
}

@injectable()
export class NotificationBusService implements INotificationBusService {
  constructor(
    @inject(TYPES.INotificationQueueService)
    private readonly queueService: INotificationQueueService,
    @inject(TYPES.ChannelDispatcher)
    private readonly dispatcher: ChannelDispatcher,
    @inject(TYPES.InAppChannel)
    private readonly inAppChannel: InAppChannel,
    @inject(TYPES.EmailChannel)
    private readonly emailChannel: EmailChannel,
    @inject(TYPES.SmsChannel)
    private readonly smsChannel: SmsChannel,
    @inject(TYPES.PushChannel)
    private readonly pushChannel: PushChannel,
    @inject(TYPES.WebhookChannel)
    private readonly webhookChannel: WebhookChannel
  ) {
    // Register channels with dispatcher
    this.dispatcher.registerChannel(this.inAppChannel);
    this.dispatcher.registerChannel(this.emailChannel);
    this.dispatcher.registerChannel(this.smsChannel);
    this.dispatcher.registerChannel(this.pushChannel);
    this.dispatcher.registerChannel(this.webhookChannel);
  }

  /**
   * Publish a notification event for delivery
   *
   * For immediate delivery (default), dispatches directly to channels.
   * For scheduled delivery, queues the event for later processing.
   */
  async publish(event: NotificationEvent): Promise<NotificationPublishResult> {
    // Validate event
    this.validateEvent(event);

    // Check if this is a scheduled notification
    if (event.scheduledFor && event.scheduledFor > new Date()) {
      return this.queueForLater(event);
    }

    // Immediate delivery via dispatcher
    const dispatchResult = await this.dispatcher.dispatch(event);

    // Queue failed retryable deliveries
    await this.queueFailedDeliveries(event, dispatchResult);

    return {
      eventId: event.id,
      channelResults: dispatchResult.results,
      queuedCount: dispatchResult.results.filter(r => r.retryable && r.status === 'failed').length,
      deliveredCount: dispatchResult.successCount,
      failedCount: dispatchResult.failedCount,
      skippedCount: dispatchResult.skippedCount,
    };
  }

  /**
   * Process pending items in the notification queue
   */
  async processQueue(batchSize: number = 50): Promise<void> {
    const items = await this.queueService.getPendingItems({
      batchSize,
    });

    for (const item of items) {
      // Claim the item for processing
      const claimed = await this.queueService.claimItem(item.id);
      if (!claimed) {
        continue; // Already claimed by another processor
      }

      try {
        // Reconstruct the event from queue item fields
        const event = this.reconstructEvent(item);
        const channel = item.channel;

        // Dispatch to the specific channel that failed
        const dispatchResult = await this.dispatcher.dispatch({
          ...event,
          channels: [channel],
        });

        const channelResult = dispatchResult.results.find(r => r.channel === channel);

        if (channelResult?.status === 'success') {
          await this.queueService.markCompleted(item.id, channelResult.providerMessageId);
        } else if (channelResult?.retryable && item.attempts < item.max_attempts) {
          await this.queueService.markFailed(
            item.id,
            channelResult?.error || 'Delivery failed',
            true
          );
        } else {
          await this.queueService.markDead(
            item.id,
            channelResult?.error || 'Max retries exceeded'
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing error';
        if (item.attempts < item.max_attempts) {
          await this.queueService.markFailed(item.id, errorMessage, true);
        } else {
          await this.queueService.markDead(item.id, errorMessage);
        }
      }
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailed(ids?: string[]): Promise<number> {
    return this.queueService.retryFailed(ids);
  }

  /**
   * Queue an event for future delivery
   */
  private async queueForLater(event: NotificationEvent): Promise<NotificationPublishResult> {
    const channels = event.channels || ['in_app', 'email'];
    const results: ChannelDispatchResult[] = [];

    for (const channel of channels) {
      await this.queueService.enqueue({
        event_type: event.eventType,
        event_id: event.id,
        tenant_id: event.tenantId,
        recipient_id: event.recipient.userId,
        channel,
        payload: {
          ...event.payload,
          _event: event, // Store full event in payload for reconstruction
        },
        priority: this.getPriorityValue(event.priority),
        scheduled_for: event.scheduledFor?.toISOString(),
      });

      results.push({
        channel,
        status: 'success',
        reason: 'Queued for scheduled delivery',
      });
    }

    return {
      eventId: event.id,
      channelResults: results,
      queuedCount: channels.length,
      deliveredCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };
  }

  /**
   * Queue failed deliveries for retry
   */
  private async queueFailedDeliveries(
    event: NotificationEvent,
    result: EventDispatchResult
  ): Promise<void> {
    for (const channelResult of result.results) {
      if (channelResult.status === 'failed' && channelResult.retryable) {
        await this.queueService.enqueue({
          event_type: event.eventType,
          event_id: event.id,
          tenant_id: event.tenantId,
          recipient_id: event.recipient.userId,
          channel: channelResult.channel,
          payload: {
            ...event.payload,
            _event: event, // Store full event in payload for reconstruction
          },
          priority: this.getPriorityValue(event.priority),
        });
      }
    }
  }

  /**
   * Reconstruct a NotificationEvent from a queue item
   */
  private reconstructEvent(item: import('@/models/notification/notificationQueue.model').NotificationQueueItem): NotificationEvent {
    // Check if the full event was stored in payload
    const storedEvent = item.payload._event as NotificationEvent | undefined;
    if (storedEvent) {
      return storedEvent;
    }

    // Fallback: reconstruct from queue item fields
    return {
      id: item.event_id,
      eventType: item.event_type as NotificationEvent['eventType'],
      category: 'system', // Default category
      priority: this.getPriorityString(item.priority),
      tenantId: item.tenant_id,
      recipient: {
        userId: item.recipient_id,
      },
      payload: item.payload,
      channels: [item.channel],
    };
  }

  /**
   * Convert numeric priority back to string
   */
  private getPriorityString(priority: number): NotificationEvent['priority'] {
    switch (priority) {
      case 4:
        return 'urgent';
      case 3:
        return 'high';
      case 1:
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Validate event has required fields
   */
  private validateEvent(event: NotificationEvent): void {
    if (!event.id) {
      throw new Error('Event ID is required');
    }
    if (!event.eventType) {
      throw new Error('Event type is required');
    }
    if (!event.tenantId) {
      throw new Error('Tenant ID is required');
    }
    if (!event.recipient?.userId) {
      throw new Error('Recipient user ID is required');
    }
  }

  /**
   * Convert priority string to numeric value for queue ordering
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'urgent':
        return 4;
      case 'high':
        return 3;
      case 'normal':
        return 2;
      case 'low':
        return 1;
      default:
        return 2;
    }
  }
}
