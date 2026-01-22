/**
 * Notification Event Model
 *
 * Represents a notification event that can be published to the notification bus.
 * Events are transformed into notifications for each delivery channel.
 */

import type { NotificationCategory, NotificationPriority } from './notification.model';

/**
 * Delivery channel types
 */
export type DeliveryChannelType = 'in_app' | 'email' | 'sms' | 'push' | 'webhook';

/**
 * Standard notification event types
 */
export enum NotificationEventType {
  // Member Events
  MEMBER_INVITED = 'member.invited',
  MEMBER_JOINED = 'member.joined',
  MEMBER_UPDATED = 'member.updated',

  // Care Plan Events
  CARE_PLAN_ASSIGNED = 'care_plan.assigned',
  CARE_PLAN_UPDATED = 'care_plan.updated',
  CARE_PLAN_FOLLOWUP_DUE = 'care_plan.followup_due',
  CARE_PLAN_CLOSED = 'care_plan.closed',

  // Discipleship Plan Events
  DISCIPLESHIP_PLAN_ASSIGNED = 'discipleship_plan.assigned',
  DISCIPLESHIP_PLAN_UPDATED = 'discipleship_plan.updated',
  DISCIPLESHIP_PLAN_MILESTONE_DUE = 'discipleship_plan.milestone_due',
  DISCIPLESHIP_MILESTONE_REACHED = 'discipleship_plan.milestone_reached',
  DISCIPLESHIP_PLAN_COMPLETED = 'discipleship_plan.completed',

  // Finance Events
  DONATION_RECEIVED = 'donation.received',
  PLEDGE_REMINDER = 'pledge.reminder',
  BUDGET_ALERT = 'budget.alert',

  // Calendar/Event Events
  EVENT_REMINDER = 'event.reminder',
  EVENT_CANCELLED = 'event.cancelled',
  EVENT_UPDATED = 'event.updated',

  // RBAC Events
  ROLE_ASSIGNED = 'role.assigned',
  ROLE_REVOKED = 'role.revoked',
  PERMISSION_CHANGED = 'permission.changed',
  DELEGATION_ASSIGNED = 'delegation.assigned',
  DELEGATION_EXPIRING = 'delegation.expiring',
  DELEGATION_EXPIRED = 'delegation.expired',

  // License Events
  LICENSE_EXPIRING = 'license.expiring',
  LICENSE_EXPIRED = 'license.expired',
  LICENSE_UPGRADED = 'license.upgraded',

  // Goals & Objectives Events
  GOAL_ASSIGNED = 'goal.assigned',
  GOAL_STATUS_CHANGED = 'goal.status_changed',
  OBJECTIVE_ASSIGNED = 'objective.assigned',
  KEY_RESULT_UPDATE_DUE = 'key_result.update_due',
  KEY_RESULT_COMPLETED = 'key_result.completed',

  // Birthday & Anniversary Events
  MEMBER_BIRTHDAY = 'member.birthday',
  MEMBER_ANNIVERSARY = 'member.anniversary',

  // System Events
  SYSTEM_MAINTENANCE = 'system.maintenance',
  SYSTEM_ANNOUNCEMENT = 'system.announcement',
}

/**
 * Recipient information for a notification
 */
export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  deviceTokens?: string[]; // For push notifications
}

/**
 * Notification event payload
 *
 * This is the main interface for publishing events to the notification bus.
 */
export interface NotificationEvent {
  /** Unique identifier for this event (for idempotency) */
  id: string;

  /** Type of event being published */
  eventType: NotificationEventType | string;

  /** Category for filtering and preferences */
  category: NotificationCategory;

  /** Priority affects delivery order */
  priority: NotificationPriority;

  /** Tenant context */
  tenantId: string;

  /** Primary recipient */
  recipient: NotificationRecipient;

  /** Template variables for rendering */
  payload: Record<string, unknown>;

  /** Override default channels for this event */
  channels?: DeliveryChannelType[];

  /** Schedule for future delivery */
  scheduledFor?: Date;

  /** Time-to-live for the notification */
  expiresAt?: Date;

  /** Additional metadata for tracking */
  metadata?: Record<string, unknown>;

  /** Correlation ID for tracing related events */
  correlationId?: string;
}

/**
 * Result of dispatching to a single channel
 */
export interface ChannelDispatchResult {
  channel: DeliveryChannelType;
  status: 'success' | 'failed' | 'skipped';
  messageId?: string;
  providerMessageId?: string;
  error?: string;
  retryable?: boolean;
  reason?: string;
}

/**
 * Result of publishing an event
 */
export interface NotificationPublishResult {
  eventId: string;
  channelResults: ChannelDispatchResult[];
  queuedCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
}

/**
 * Default channels per category
 */
export const DEFAULT_CHANNELS_BY_CATEGORY: Record<NotificationCategory, DeliveryChannelType[]> = {
  system: ['in_app'],
  security: ['in_app', 'email'],
  member: ['in_app', 'email'],
  finance: ['in_app', 'email'],
  event: ['in_app', 'email', 'push'],
  communication: ['in_app', 'push'],
  planning: ['in_app', 'email', 'push'],
};

/**
 * Feature code required for each channel
 */
export const CHANNEL_FEATURE_CODES: Record<DeliveryChannelType, string> = {
  in_app: 'notifications.core',
  email: 'integrations.email',
  sms: 'integrations.sms',
  push: 'notifications.push',
  webhook: 'integrations.api',
};
