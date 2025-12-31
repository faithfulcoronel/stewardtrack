/**
 * Notification Services Module
 *
 * Exports all notification-related services for multi-channel delivery.
 */

// Core Services
export { NotificationService, type INotificationService } from './NotificationService';
export { NotificationQueueService, type INotificationQueueService } from './NotificationQueueService';
export { NotificationBusService, type INotificationBusService } from './NotificationBusService';
export { ChannelDispatcher, type EventDispatchResult } from './ChannelDispatcher';

// Channel Implementations
export {
  type IDeliveryChannel,
  type NotificationMessage,
  type DeliveryResult,
  type DeliveryStatus,
  type RecipientInfo,
  InAppChannel,
  EmailChannel,
  SmsChannel,
  PushChannel,
  WebhookChannel,
} from './channels';
