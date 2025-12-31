/**
 * Notification Queue Model
 *
 * Represents a queued notification for async processing
 */

import type { BaseModel } from '@/models/base.model';
import type { DeliveryChannelType } from './notificationEvent.model';

/**
 * Queue item status
 */
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead';

/**
 * Notification queue item entity
 */
export interface NotificationQueueItem extends BaseModel {
  id: string;

  // Event identification
  event_type: string;
  event_id: string;
  tenant_id: string;
  recipient_id: string;

  // Channel routing
  channel: DeliveryChannelType;

  // Message content
  payload: Record<string, unknown>;

  // Queue management
  status: QueueStatus;
  priority: number;

  // Retry logic
  attempts: number;
  max_attempts: number;
  next_attempt_at?: string;

  // Scheduling
  scheduled_for?: string;

  // Tracking
  created_at: string;
  processed_at?: string;
  completed_at?: string;
  error_message?: string;

  // Correlation
  correlation_id?: string;
  parent_queue_id?: string;
}

/**
 * DTO for creating a queue item
 */
export interface CreateQueueItemDto {
  event_type: string;
  event_id: string;
  tenant_id: string;
  recipient_id: string;
  channel: DeliveryChannelType;
  payload: Record<string, unknown>;
  priority?: number;
  max_attempts?: number;
  scheduled_for?: string;
  correlation_id?: string;
  parent_queue_id?: string;
}

/**
 * DTO for updating a queue item
 */
export interface UpdateQueueItemDto {
  status?: QueueStatus;
  attempts?: number;
  next_attempt_at?: string;
  processed_at?: string;
  completed_at?: string;
  error_message?: string;
}

/**
 * Queue processing options
 */
export interface QueueProcessingOptions {
  /** Maximum number of items to process in one batch */
  batchSize?: number;

  /** Only process items for specific channels */
  channels?: DeliveryChannelType[];

  /** Only process items for specific tenant */
  tenantId?: string;

  /** Include scheduled items that are due */
  includeScheduled?: boolean;
}

/**
 * Queue statistics
 */
export interface QueueStatistics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  dead: number;
  scheduled: number;
  total: number;
  oldestPending?: string;
  averageProcessingTime?: number;
}
