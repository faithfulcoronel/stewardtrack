/**
 * ================================================================================
 * CHANNEL DISPATCHER
 * ================================================================================
 *
 * Routes notification events to appropriate delivery channels based on:
 * 1. Tenant feature access (license tier)
 * 2. User preferences
 * 3. Event priority and category defaults
 *
 * Uses Strategy Pattern to dispatch to channel implementations.
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { RbacFeatureService } from '@/services/rbacFeature.service';
import type { INotificationService } from './NotificationService';
import type {
  NotificationEvent,
  DeliveryChannelType,
  ChannelDispatchResult,
  DEFAULT_CHANNELS_BY_CATEGORY,
  CHANNEL_FEATURE_CODES,
} from '@/models/notification/notificationEvent.model';
import type { IDeliveryChannel, NotificationMessage, RecipientInfo } from './channels/IDeliveryChannel';
import type { NotificationCategory } from '@/models/notification/notification.model';

/**
 * Dispatch result for the entire event
 */
export interface EventDispatchResult {
  eventId: string;
  results: ChannelDispatchResult[];
  successCount: number;
  failedCount: number;
  skippedCount: number;
}

@injectable()
export class ChannelDispatcher {
  private channels: Map<DeliveryChannelType, IDeliveryChannel> = new Map();

  constructor(
    @inject(TYPES.RbacFeatureService)
    private readonly featureService: RbacFeatureService,
    @inject(TYPES.INotificationService)
    private readonly notificationService: INotificationService
  ) {}

  /**
   * Register a delivery channel implementation
   */
  registerChannel(channel: IDeliveryChannel): void {
    this.channels.set(channel.channelType, channel);
  }

  /**
   * Dispatch a notification event to all applicable channels
   */
  async dispatch(event: NotificationEvent): Promise<EventDispatchResult> {
    const results: ChannelDispatchResult[] = [];

    // Determine which channels to use
    const channelsToUse = await this.resolveChannels(event);

    for (const channelType of channelsToUse) {
      const result = await this.dispatchToChannel(event, channelType);
      results.push(result);
    }

    return {
      eventId: event.id,
      results,
      successCount: results.filter(r => r.status === 'success').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      skippedCount: results.filter(r => r.status === 'skipped').length,
    };
  }

  /**
   * Resolve which channels should receive this event
   */
  private async resolveChannels(event: NotificationEvent): Promise<DeliveryChannelType[]> {
    // Start with explicitly specified channels or category defaults
    const defaultChannels = this.getDefaultChannels(event.category);
    const requestedChannels = event.channels || defaultChannels;

    const availableChannels: DeliveryChannelType[] = [];

    for (const channelType of requestedChannels) {
      // Check if channel implementation exists
      const channel = this.channels.get(channelType);
      if (!channel) {
        continue;
      }

      // Check if channel is available (configured)
      const isAvailable = await channel.isAvailable();
      if (!isAvailable) {
        continue;
      }

      // Check if tenant has feature access for this channel
      const featureCode = this.getFeatureCode(channelType);
      const hasAccess = await this.featureService.hasFeatureAccess(featureCode, event.tenantId);
      if (!hasAccess) {
        continue;
      }

      // Check user preferences
      const shouldDeliver = await this.checkUserPreferences(
        event.recipient.userId,
        event.tenantId,
        event.category,
        channelType
      );
      if (!shouldDeliver) {
        continue;
      }

      availableChannels.push(channelType);
    }

    // Always include in_app if available, regardless of preferences (can be dismissed)
    if (!availableChannels.includes('in_app') && this.channels.has('in_app')) {
      const inAppChannel = this.channels.get('in_app')!;
      const isAvailable = await inAppChannel.isAvailable();
      const hasAccess = await this.featureService.hasFeatureAccess('notifications-inapp', event.tenantId);

      if (isAvailable && hasAccess) {
        availableChannels.unshift('in_app');
      }
    }

    return availableChannels;
  }

  /**
   * Dispatch to a single channel
   */
  private async dispatchToChannel(
    event: NotificationEvent,
    channelType: DeliveryChannelType
  ): Promise<ChannelDispatchResult> {
    const channel = this.channels.get(channelType);

    if (!channel) {
      return {
        channel: channelType,
        status: 'skipped',
        reason: 'Channel implementation not registered',
      };
    }

    // Build recipient info
    const recipient: RecipientInfo = {
      userId: event.recipient.userId,
      email: event.recipient.email,
      phone: event.recipient.phone,
      deviceTokens: event.recipient.deviceTokens,
    };

    // Validate recipient for this channel
    const isValid = await channel.validateRecipient(recipient);
    if (!isValid) {
      return {
        channel: channelType,
        status: 'skipped',
        reason: `Recipient not valid for ${channelType} channel`,
      };
    }

    // Build notification message
    const message = await this.buildMessage(event, recipient);

    // Send via channel
    const result = await channel.send(message);

    return {
      channel: channelType,
      status: result.success ? 'success' : 'failed',
      messageId: result.messageId,
      providerMessageId: result.providerMessageId,
      error: result.error,
      retryable: result.retryable,
    };
  }

  /**
   * Build a NotificationMessage from an event
   */
  private async buildMessage(
    event: NotificationEvent,
    recipient: RecipientInfo
  ): Promise<NotificationMessage> {
    // Try to get a template for this event
    const template = await this.notificationService.getTemplate({
      eventType: event.eventType,
      channel: 'in_app', // Default to in_app template
      tenantId: event.tenantId,
    });

    let title: string;
    let body: string;
    let subject: string | undefined;
    let htmlBody: string | undefined;

    if (template) {
      const rendered = this.notificationService.renderTemplate(template, event.payload);
      title = rendered.title || event.eventType;
      body = rendered.body;
      subject = rendered.subject;
      htmlBody = rendered.htmlBody;
    } else {
      // Use payload directly if no template
      title = (event.payload.title as string) || this.formatEventType(event.eventType);
      body = (event.payload.message as string) || (event.payload.body as string) || '';
      subject = event.payload.subject as string | undefined;
    }

    return {
      id: `${event.id}-${Date.now()}`,
      event,
      title,
      body,
      subject,
      htmlBody,
      recipient,
      metadata: {
        ...event.metadata,
        actionType: event.payload.actionType,
        actionPayload: event.payload.actionPayload,
      },
    };
  }

  /**
   * Check user preferences for delivery
   */
  private async checkUserPreferences(
    userId: string,
    tenantId: string,
    category: NotificationCategory,
    channel: DeliveryChannelType
  ): Promise<boolean> {
    const result = await this.notificationService.checkShouldDeliver(
      userId,
      tenantId,
      category,
      channel
    );
    return result.shouldDeliver;
  }

  /**
   * Get default channels for a category
   */
  private getDefaultChannels(category: NotificationCategory): DeliveryChannelType[] {
    // Import the constant mapping
    const defaults: Record<NotificationCategory, DeliveryChannelType[]> = {
      system: ['in_app'],
      security: ['in_app', 'email'],
      member: ['in_app', 'email'],
      finance: ['in_app', 'email'],
      event: ['in_app', 'email', 'push'],
      communication: ['in_app', 'push'],
    };
    return defaults[category] || ['in_app'];
  }

  /**
   * Get feature code for a channel
   */
  private getFeatureCode(channel: DeliveryChannelType): string {
    const codes: Record<DeliveryChannelType, string> = {
      in_app: 'notifications-inapp',
      email: 'notifications-email',
      sms: 'notifications-sms',
      push: 'notifications-push',
      webhook: 'notifications-webhooks',
    };
    return codes[channel];
  }

  /**
   * Format event type for display
   */
  private formatEventType(eventType: string): string {
    return eventType
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
