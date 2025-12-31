/**
 * ================================================================================
 * DELIVERY CHANNEL INTERFACE
 * ================================================================================
 *
 * Interface for notification delivery channels (Strategy Pattern).
 * Each channel implementation handles a specific delivery method.
 *
 * Available Channels:
 * - InAppChannel: Stores to notifications table, triggers realtime
 * - EmailChannel: Sends via Resend API
 * - SmsChannel: Sends via Twilio (Enterprise+)
 * - PushChannel: Sends via Firebase Cloud Messaging (Professional+)
 * - WebhookChannel: HTTP POST to external endpoints (Enterprise+)
 *
 * ================================================================================
 */

import type { DeliveryChannelType, NotificationEvent } from '@/models/notification/notificationEvent.model';

/**
 * Recipient information for delivery
 */
export interface RecipientInfo {
  userId: string;
  email?: string;
  phone?: string;
  deviceTokens?: string[];
  webhookUrl?: string;
}

/**
 * Message to be delivered through a channel
 */
export interface NotificationMessage {
  /** Unique message identifier */
  id: string;

  /** The original event that triggered this notification */
  event: NotificationEvent;

  /** Rendered subject line (for email) */
  subject?: string;

  /** Rendered title */
  title: string;

  /** Rendered message body */
  body: string;

  /** HTML body (for email) */
  htmlBody?: string;

  /** Recipient information */
  recipient: RecipientInfo;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a delivery attempt
 */
export interface DeliveryResult {
  /** Whether delivery was successful */
  success: boolean;

  /** Internal message ID */
  messageId: string;

  /** Provider-assigned message ID (e.g., Resend ID, Twilio SID) */
  providerMessageId?: string;

  /** Error message if failed */
  error?: string;

  /** Whether the error is retryable */
  retryable?: boolean;

  /** Suggested retry delay in milliseconds */
  retryAfterMs?: number;
}

/**
 * Delivery status for tracking
 */
export interface DeliveryStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * Delivery Channel Interface
 *
 * Implement this interface to add new notification delivery channels.
 */
export interface IDeliveryChannel {
  /** The type of this channel */
  readonly channelType: DeliveryChannelType;

  /** Feature code required to use this channel */
  readonly featureCode: string;

  /** Whether the channel is currently available (configured, healthy) */
  isAvailable(): Promise<boolean>;

  /**
   * Send a notification through this channel
   * @param message The notification message to send
   * @returns Delivery result with success status and message IDs
   */
  send(message: NotificationMessage): Promise<DeliveryResult>;

  /**
   * Get the delivery status of a previously sent message
   * @param messageId The internal message ID
   * @returns Current delivery status
   */
  getDeliveryStatus?(messageId: string): Promise<DeliveryStatus | null>;

  /**
   * Validate that a recipient can receive notifications on this channel
   * @param recipient Recipient information to validate
   * @returns Whether the recipient can receive on this channel
   */
  validateRecipient(recipient: RecipientInfo): Promise<boolean>;
}
