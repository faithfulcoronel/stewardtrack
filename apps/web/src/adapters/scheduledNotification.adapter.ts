/**
 * ================================================================================
 * SCHEDULED NOTIFICATION ADAPTER
 * ================================================================================
 *
 * Adapter for scheduled notification operations - handles database interactions
 * for birthday/anniversary/reminder notifications and job run tracking.
 *
 * Only this adapter should interact with Supabase for scheduled notifications.
 *
 * ================================================================================
 */

import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';

// ============================================================================
// TYPES
// ============================================================================

export interface MemberBirthday {
  member_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  contact_number: string | null;
  user_id: string | null;
  birthday: string;
  profile_picture_url: string | null;
  age: number;
}

export interface MemberAnniversary {
  member_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  contact_number: string | null;
  user_id: string | null;
  anniversary: string;
  years: number;
}

export interface CalendarReminder {
  reminder_id: string;
  event_id: string;
  event_title: string;
  event_start_at: string;
  remind_at: string;
  recipient_id: string | null;
  notification_type: string;
}

export interface Tenant {
  id: string;
  name: string;
}

export interface ScheduledNotificationLog {
  id: string;
  tenant_id: string;
  notification_type: string;
  target_entity_type: string;
  target_entity_id: string;
  target_date: string;
  status: 'sent' | 'failed' | 'skipped';
  error_message?: string | null;
  channels_used?: string[];
  recipient_user_id?: string | null;
  recipient_email?: string | null;
  recipient_name?: string | null;
  metadata?: Record<string, unknown>;
  sent_at: string;
  created_at: string;
}

export interface ScheduledJobRun {
  id: string;
  job_type: string;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  tenants_processed?: number;
  notifications_sent?: number;
  notifications_skipped?: number;
  notifications_failed?: number;
  error_message?: string | null;
  details?: Record<string, unknown>;
  triggered_by?: string;
  source_ip?: string | null;
  created_at: string;
}

export interface LogNotificationParams {
  tenantId: string;
  notificationType: string;
  targetEntityType: string;
  targetEntityId: string;
  status: 'sent' | 'failed' | 'skipped';
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientName?: string;
  channelsUsed?: string[];
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface JobRunUpdateParams {
  status: 'running' | 'completed' | 'failed' | 'partial';
  completedAt?: string;
  durationMs?: number;
  tenantsProcessed?: number;
  notificationsSent?: number;
  notificationsSkipped?: number;
  notificationsFailed?: number;
  errorMessage?: string | null;
  details?: Record<string, unknown>;
}

// ============================================================================
// INTERFACE
// ============================================================================

export interface IScheduledNotificationAdapter extends IBaseAdapter<ScheduledNotificationLog> {
  // Tenant queries
  getAllActiveTenants(): Promise<Tenant[]>;

  // Member queries (via RPC functions)
  getMembersWithBirthdayToday(tenantId: string): Promise<MemberBirthday[]>;
  getMembersWithAnniversaryToday(tenantId: string): Promise<MemberAnniversary[]>;
  getPendingCalendarReminders(tenantId: string): Promise<CalendarReminder[]>;

  // Notification log
  wasNotificationSent(
    tenantId: string,
    notificationType: string,
    targetEntityType: string,
    targetEntityId: string
  ): Promise<boolean>;
  logNotification(params: LogNotificationParams): Promise<void>;

  // Calendar reminder update
  markReminderAsSent(reminderId: string): Promise<void>;

  // Job run tracking
  createJobRun(jobId: string, jobType: string, triggeredBy: string): Promise<void>;
  updateJobRun(jobId: string, params: JobRunUpdateParams): Promise<void>;

  // Cleanup
  cleanupOldLogs(): Promise<number>;
}

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

@injectable()
export class ScheduledNotificationAdapter
  extends BaseAdapter<ScheduledNotificationLog>
  implements IScheduledNotificationAdapter
{
  protected tableName = 'scheduled_notification_log';
  protected defaultSelect = '*';

  /**
   * Get all active tenants.
   */
  async getAllActiveTenants(): Promise<Tenant[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to fetch tenants: ${error.message}`);
    }

    return (data as unknown as Tenant[]) || [];
  }

  /**
   * Get members with birthdays today (uses RPC function).
   */
  async getMembersWithBirthdayToday(tenantId: string): Promise<MemberBirthday[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .rpc('get_members_with_birthday_today', { p_tenant_id: tenantId });

    if (error) {
      throw new Error(`Failed to get birthdays: ${error.message}`);
    }

    return (data as unknown as MemberBirthday[]) || [];
  }

  /**
   * Get members with anniversaries today (uses RPC function).
   */
  async getMembersWithAnniversaryToday(tenantId: string): Promise<MemberAnniversary[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .rpc('get_members_with_anniversary_today', { p_tenant_id: tenantId });

    if (error) {
      throw new Error(`Failed to get anniversaries: ${error.message}`);
    }

    return (data as unknown as MemberAnniversary[]) || [];
  }

  /**
   * Get pending calendar reminders (uses RPC function).
   */
  async getPendingCalendarReminders(tenantId: string): Promise<CalendarReminder[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .rpc('get_pending_calendar_reminders', { p_tenant_id: tenantId });

    if (error) {
      throw new Error(`Failed to get reminders: ${error.message}`);
    }

    return (data as unknown as CalendarReminder[]) || [];
  }

  /**
   * Check if a notification was already sent today.
   */
  async wasNotificationSent(
    tenantId: string,
    notificationType: string,
    targetEntityType: string,
    targetEntityId: string
  ): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(this.tableName)
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('notification_type', notificationType)
      .eq('target_entity_type', targetEntityType)
      .eq('target_entity_id', targetEntityId)
      .eq('target_date', today)
      .eq('status', 'sent')
      .limit(1);

    if (error) {
      console.error(`[ScheduledNotificationAdapter] Error checking notification log: ${error.message}`);
      return false; // Proceed with sending if check fails
    }

    return data && data.length > 0;
  }

  /**
   * Log a notification send attempt.
   */
  async logNotification(params: LogNotificationParams): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: params.tenantId,
        notification_type: params.notificationType,
        target_entity_type: params.targetEntityType,
        target_entity_id: params.targetEntityId,
        target_date: today,
        status: params.status,
        error_message: params.errorMessage || null,
        recipient_user_id: params.recipientUserId || null,
        recipient_email: params.recipientEmail || null,
        recipient_name: params.recipientName || null,
        channels_used: params.channelsUsed || [],
        metadata: params.metadata || {},
      });

    if (error) {
      // Log but don't throw - the notification may have been sent successfully
      console.error(`[ScheduledNotificationAdapter] Failed to log notification: ${error.message}`);
    }
  }

  /**
   * Mark a calendar reminder as sent.
   */
  async markReminderAsSent(reminderId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('calendar_event_reminders')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', reminderId);

    if (error) {
      throw new Error(`Failed to mark reminder as sent: ${error.message}`);
    }
  }

  /**
   * Create a new job run record.
   */
  async createJobRun(jobId: string, jobType: string, triggeredBy: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('scheduled_job_runs')
      .insert({
        id: jobId,
        job_type: jobType,
        status: 'running',
        triggered_by: triggeredBy,
      });

    if (error) {
      console.error(`[ScheduledNotificationAdapter] Failed to create job run: ${error.message}`);
    }
  }

  /**
   * Update a job run record.
   */
  async updateJobRun(jobId: string, params: JobRunUpdateParams): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      status: params.status,
    };

    if (params.completedAt) updateData.completed_at = params.completedAt;
    if (params.durationMs !== undefined) updateData.duration_ms = params.durationMs;
    if (params.tenantsProcessed !== undefined) updateData.tenants_processed = params.tenantsProcessed;
    if (params.notificationsSent !== undefined) updateData.notifications_sent = params.notificationsSent;
    if (params.notificationsSkipped !== undefined) updateData.notifications_skipped = params.notificationsSkipped;
    if (params.notificationsFailed !== undefined) updateData.notifications_failed = params.notificationsFailed;
    if (params.errorMessage !== undefined) updateData.error_message = params.errorMessage;
    if (params.details) updateData.details = params.details;

    const { error } = await supabase
      .from('scheduled_job_runs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error(`[ScheduledNotificationAdapter] Failed to update job run: ${error.message}`);
    }
  }

  /**
   * Clean up old notification logs.
   */
  async cleanupOldLogs(): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('cleanup_old_notification_logs');

    if (error) {
      console.error(`[ScheduledNotificationAdapter] Cleanup failed: ${error.message}`);
      return 0;
    }

    return (data as number) || 0;
  }
}
