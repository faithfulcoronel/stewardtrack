/**
 * Notification Preference Model
 *
 * User preferences for notification delivery
 */

import type { BaseModel } from '@/models/base.model';
import type { NotificationCategory } from './notification.model';
import type { DeliveryChannelType } from './notificationEvent.model';

/**
 * Digest frequency options
 */
export type DigestFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

/**
 * Notification preference entity
 */
export interface NotificationPreference extends BaseModel {
  id: string;
  user_id: string;
  tenant_id: string;

  // Preference settings
  category: NotificationCategory | 'all';
  channel: DeliveryChannelType;
  enabled: boolean;

  // Digest settings
  digest_frequency?: DigestFrequency;

  // Quiet hours
  quiet_hours_start?: string; // TIME format HH:MM:SS
  quiet_hours_end?: string;
  quiet_hours_timezone?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * DTO for creating/updating a preference
 */
export interface UpsertNotificationPreferenceDto {
  category: NotificationCategory | 'all';
  channel: DeliveryChannelType;
  enabled: boolean;
  digest_frequency?: DigestFrequency;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_timezone?: string;
}

/**
 * Bulk preference update DTO
 */
export interface BulkUpdatePreferencesDto {
  preferences: UpsertNotificationPreferenceDto[];
}

/**
 * User's complete preference set for display
 */
export interface UserNotificationPreferences {
  userId: string;
  tenantId: string;
  preferences: NotificationPreference[];
  availableChannels: DeliveryChannelType[];
  defaultPreferences: DefaultPreference[];
}

/**
 * Default preference for a category/channel combo
 */
export interface DefaultPreference {
  category: NotificationCategory | 'all';
  channel: DeliveryChannelType;
  defaultEnabled: boolean;
  featureCode: string;
  isAvailable: boolean;
}

/**
 * Check if notification should be delivered based on preferences
 */
export interface DeliveryCheckResult {
  shouldDeliver: boolean;
  reason?: string;
  isQuietHours?: boolean;
  digestFrequency?: DigestFrequency;
}
