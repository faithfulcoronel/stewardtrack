import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  NotificationPreference,
  UpsertNotificationPreferenceDto,
  DeliveryCheckResult,
} from '@/models/notification/notificationPreference.model';
import type { NotificationCategory } from '@/models/notification/notification.model';
import type { DeliveryChannelType } from '@/models/notification/notificationEvent.model';

export interface INotificationPreferenceAdapter extends IBaseAdapter<NotificationPreference> {
  /**
   * Get all preferences for a user in a tenant
   */
  getUserPreferences(userId: string, tenantId: string): Promise<NotificationPreference[]>;

  /**
   * Get a specific preference
   */
  getPreference(
    userId: string,
    tenantId: string,
    category: NotificationCategory | 'all',
    channel: DeliveryChannelType
  ): Promise<NotificationPreference | null>;

  /**
   * Upsert a preference
   */
  upsertPreference(
    userId: string,
    tenantId: string,
    preference: UpsertNotificationPreferenceDto
  ): Promise<NotificationPreference>;

  /**
   * Check if delivery should occur based on preferences
   */
  checkShouldDeliver(
    userId: string,
    tenantId: string,
    category: NotificationCategory,
    channel: DeliveryChannelType
  ): Promise<DeliveryCheckResult>;

  /**
   * Reset preferences to defaults
   */
  resetToDefaults(userId: string, tenantId: string): Promise<void>;
}

@injectable()
export class NotificationPreferenceAdapter
  extends BaseAdapter<NotificationPreference>
  implements INotificationPreferenceAdapter
{
  protected tableName = 'notification_preferences';

  protected defaultSelect = `
    id,
    user_id,
    tenant_id,
    category,
    channel,
    enabled,
    digest_frequency,
    quiet_hours_start,
    quiet_hours_end,
    quiet_hours_timezone,
    created_at,
    updated_at
  `;

  async getUserPreferences(userId: string, tenantId: string): Promise<NotificationPreference[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('category')
      .order('channel');

    if (error) throw error;
    return (data ?? []) as unknown as NotificationPreference[];
  }

  async getPreference(
    userId: string,
    tenantId: string,
    category: NotificationCategory | 'all',
    channel: DeliveryChannelType
  ): Promise<NotificationPreference | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('category', category)
      .eq('channel', channel)
      .maybeSingle();

    if (error) throw error;
    return data as NotificationPreference | null;
  }

  async upsertPreference(
    userId: string,
    tenantId: string,
    preference: UpsertNotificationPreferenceDto
  ): Promise<NotificationPreference> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          category: preference.category,
          channel: preference.channel,
          enabled: preference.enabled,
          digest_frequency: preference.digest_frequency,
          quiet_hours_start: preference.quiet_hours_start,
          quiet_hours_end: preference.quiet_hours_end,
          quiet_hours_timezone: preference.quiet_hours_timezone,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,tenant_id,category,channel',
        }
      )
      .select(this.defaultSelect)
      .single();

    if (error) throw error;
    return data as unknown as NotificationPreference;
  }

  async checkShouldDeliver(
    userId: string,
    tenantId: string,
    category: NotificationCategory,
    channel: DeliveryChannelType
  ): Promise<DeliveryCheckResult> {
    // Check specific category preference first
    let preference = await this.getPreference(userId, tenantId, category, channel);

    // Fall back to 'all' category preference
    if (!preference) {
      preference = await this.getPreference(userId, tenantId, 'all', channel);
    }

    // No preference means default to enabled
    if (!preference) {
      return { shouldDeliver: true };
    }

    // Check if disabled
    if (!preference.enabled) {
      return {
        shouldDeliver: false,
        reason: 'User has disabled this notification type',
      };
    }

    // Check quiet hours
    if (preference.quiet_hours_start && preference.quiet_hours_end) {
      const isQuietHours = this.isInQuietHours(
        preference.quiet_hours_start,
        preference.quiet_hours_end,
        preference.quiet_hours_timezone || 'UTC'
      );

      if (isQuietHours) {
        return {
          shouldDeliver: false,
          reason: 'Currently in quiet hours',
          isQuietHours: true,
          digestFrequency: preference.digest_frequency,
        };
      }
    }

    return {
      shouldDeliver: true,
      digestFrequency: preference.digest_frequency,
    };
  }

  async resetToDefaults(userId: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }

  private isInQuietHours(start: string, end: string, timezone: string): boolean {
    try {
      // Get current time in the specified timezone
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };

      const currentTimeStr = now.toLocaleTimeString('en-US', options);
      const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);
      const currentMinutes = currentHour * 60 + currentMinute;

      // Parse start and end times
      const [startHour, startMinute] = start.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;

      const [endHour, endMinute] = end.split(':').map(Number);
      const endMinutes = endHour * 60 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 to 07:00)
      if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      // If timezone is invalid, don't block delivery
      return false;
    }
  }
}
