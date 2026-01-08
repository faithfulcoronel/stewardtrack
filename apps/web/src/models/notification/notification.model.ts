/**
 * Notification Model
 *
 * Represents an in-app notification stored in the notifications table
 */

import type { BaseModel } from '@/models/base.model';

/**
 * Notification type - visual styling indicator
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification category - for filtering and preferences
 */
export type NotificationCategory =
  | 'system'
  | 'security'
  | 'member'
  | 'finance'
  | 'event'
  | 'communication'
  | 'planning';

/**
 * Notification priority - affects delivery order and styling
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Action type - what happens when notification is clicked
 */
export type NotificationActionType = 'redirect' | 'modal' | 'none';

/**
 * Notification entity
 */
export interface Notification extends BaseModel {
  id: string;
  user_id: string;
  tenant_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  is_read: boolean;
  action_type: NotificationActionType;
  action_payload?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
  created_at?: string;
}

/**
 * DTO for creating a notification
 */
export interface CreateNotificationDto {
  user_id: string;
  tenant_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  action_type?: NotificationActionType;
  action_payload?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

/**
 * DTO for updating a notification (mainly for marking as read)
 */
export interface UpdateNotificationDto {
  is_read?: boolean;
}

/**
 * Notification with unread count for list views
 */
export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
}
