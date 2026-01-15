/**
 * ================================================================================
 * SCHEDULED EVENTS SERVICE
 * ================================================================================
 *
 * Background service that checks for scheduled events and sends notifications:
 * - Birthday greetings
 * - Anniversary greetings
 * - Calendar event reminders
 *
 * This service is designed to be called by a cron job (e.g., Vercel Cron)
 * and includes idempotency checks to prevent duplicate notifications.
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import type { IScheduledNotificationRepository } from '@/repositories/scheduledNotification.repository';
import type {
  MemberBirthday,
  MemberAnniversary,
  CalendarReminder,
  Tenant,
} from '@/adapters/scheduledNotification.adapter';
import { NotificationEventType } from '@/models/notification/notificationEvent.model';
import { randomUUID } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface JobRunResult {
  jobId: string;
  status: 'completed' | 'failed' | 'partial';
  tenantsProcessed: number;
  notificationsSent: number;
  notificationsSkipped: number;
  notificationsFailed: number;
  durationMs: number;
  details: {
    birthdays: { sent: number; skipped: number; failed: number };
    anniversaries: { sent: number; skipped: number; failed: number };
    reminders: { sent: number; skipped: number; failed: number };
  };
  errors: string[];
}

// ============================================================================
// SERVICE
// ============================================================================

@injectable()
export class ScheduledEventsService {
  constructor(
    @inject(TYPES.NotificationBusService)
    private notificationBus: INotificationBusService,
    @inject(TYPES.IScheduledNotificationRepository)
    private scheduledNotificationRepository: IScheduledNotificationRepository,
  ) {}

  /**
   * Process all scheduled events for all tenants.
   * This is the main entry point called by the cron job.
   */
  async processScheduledEvents(triggeredBy: string = 'cron'): Promise<JobRunResult> {
    const startTime = Date.now();
    const jobId = randomUUID();

    const result: JobRunResult = {
      jobId,
      status: 'completed',
      tenantsProcessed: 0,
      notificationsSent: 0,
      notificationsSkipped: 0,
      notificationsFailed: 0,
      durationMs: 0,
      details: {
        birthdays: { sent: 0, skipped: 0, failed: 0 },
        anniversaries: { sent: 0, skipped: 0, failed: 0 },
        reminders: { sent: 0, skipped: 0, failed: 0 },
      },
      errors: [],
    };

    try {
      // Log job start
      await this.scheduledNotificationRepository.createJobRun(jobId, 'daily_notifications', triggeredBy);

      // Get all active tenants
      const tenants = await this.scheduledNotificationRepository.getAllActiveTenants();

      if (!tenants || tenants.length === 0) {
        console.log('[ScheduledEventsService] No active tenants found');
        await this.logJobComplete(jobId, result);
        return result;
      }

      console.log(`[ScheduledEventsService] Processing ${tenants.length} tenants`);

      // Process each tenant
      for (const tenant of tenants) {
        try {
          await this.processTenantEvents(tenant, result);
          result.tenantsProcessed++;
        } catch (error) {
          const errorMsg = `Tenant ${tenant.id} (${tenant.name}): ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`[ScheduledEventsService] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.status = 'partial';
        }
      }

      // Cleanup old logs (run occasionally)
      if (Math.random() < 0.1) { // 10% chance to run cleanup
        await this.scheduledNotificationRepository.cleanupOldLogs();
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ScheduledEventsService] Job failed: ${errorMsg}`);
      result.errors.push(errorMsg);
      result.status = 'failed';
    }

    result.durationMs = Date.now() - startTime;
    await this.logJobComplete(jobId, result);

    console.log(`[ScheduledEventsService] Job ${jobId} completed in ${result.durationMs}ms`);
    console.log(`[ScheduledEventsService] Sent: ${result.notificationsSent}, Skipped: ${result.notificationsSkipped}, Failed: ${result.notificationsFailed}`);

    return result;
  }

  /**
   * Process scheduled events for a single tenant.
   */
  private async processTenantEvents(
    tenant: Tenant,
    result: JobRunResult
  ): Promise<void> {
    console.log(`[ScheduledEventsService] Processing tenant: ${tenant.name} (${tenant.id})`);

    // Process birthdays
    await this.processBirthdays(tenant, result);

    // Process anniversaries
    await this.processAnniversaries(tenant, result);

    // Process calendar reminders
    await this.processCalendarReminders(tenant, result);
  }

  /**
   * Process birthday notifications for a tenant.
   */
  private async processBirthdays(
    tenant: Tenant,
    result: JobRunResult
  ): Promise<void> {
    try {
      const birthdays = await this.scheduledNotificationRepository.getMembersWithBirthdayToday(tenant.id);

      if (!birthdays || birthdays.length === 0) {
        console.log(`[ScheduledEventsService] No birthdays today for tenant: ${tenant.name}`);
        return;
      }

      console.log(`[ScheduledEventsService] Found ${birthdays.length} birthdays for tenant: ${tenant.name}`);

      for (const member of birthdays) {
        try {
          // Check if already sent
          const alreadySent = await this.scheduledNotificationRepository.wasNotificationSent(
            tenant.id,
            'birthday',
            'member',
            member.member_id
          );

          if (alreadySent) {
            result.notificationsSkipped++;
            result.details.birthdays.skipped++;
            continue;
          }

          // Send birthday notification
          await this.sendBirthdayNotification(tenant, member);

          // Log successful send
          await this.scheduledNotificationRepository.logNotification({
            tenantId: tenant.id,
            notificationType: 'birthday',
            targetEntityType: 'member',
            targetEntityId: member.member_id,
            status: 'sent',
            recipientUserId: member.user_id,
            recipientEmail: member.email,
            recipientName: `${member.first_name} ${member.last_name}`,
            channelsUsed: member.user_id ? ['in_app', 'email'] : ['email'],
            metadata: { age: member.age },
          });

          result.notificationsSent++;
          result.details.birthdays.sent++;

        } catch (error) {
          const errorMsg = `Birthday notification for ${member.first_name} ${member.last_name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`[ScheduledEventsService] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.notificationsFailed++;
          result.details.birthdays.failed++;

          // Log failed attempt
          await this.scheduledNotificationRepository.logNotification({
            tenantId: tenant.id,
            notificationType: 'birthday',
            targetEntityType: 'member',
            targetEntityId: member.member_id,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error(`[ScheduledEventsService] Failed to get birthdays for tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      result.errors.push(`Birthdays for ${tenant.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process anniversary notifications for a tenant.
   */
  private async processAnniversaries(
    tenant: Tenant,
    result: JobRunResult
  ): Promise<void> {
    try {
      const anniversaries = await this.scheduledNotificationRepository.getMembersWithAnniversaryToday(tenant.id);

      if (!anniversaries || anniversaries.length === 0) {
        console.log(`[ScheduledEventsService] No anniversaries today for tenant: ${tenant.name}`);
        return;
      }

      console.log(`[ScheduledEventsService] Found ${anniversaries.length} anniversaries for tenant: ${tenant.name}`);

      for (const member of anniversaries) {
        try {
          const alreadySent = await this.scheduledNotificationRepository.wasNotificationSent(
            tenant.id,
            'anniversary',
            'member',
            member.member_id
          );

          if (alreadySent) {
            result.notificationsSkipped++;
            result.details.anniversaries.skipped++;
            continue;
          }

          // Send anniversary notification
          await this.sendAnniversaryNotification(tenant, member);

          // Log successful send
          await this.scheduledNotificationRepository.logNotification({
            tenantId: tenant.id,
            notificationType: 'anniversary',
            targetEntityType: 'member',
            targetEntityId: member.member_id,
            status: 'sent',
            recipientUserId: member.user_id,
            recipientEmail: member.email,
            recipientName: `${member.first_name} ${member.last_name}`,
            channelsUsed: member.user_id ? ['in_app', 'email'] : ['email'],
            metadata: { years: member.years },
          });

          result.notificationsSent++;
          result.details.anniversaries.sent++;

        } catch (error) {
          const errorMsg = `Anniversary notification for ${member.first_name} ${member.last_name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`[ScheduledEventsService] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.notificationsFailed++;
          result.details.anniversaries.failed++;

          await this.scheduledNotificationRepository.logNotification({
            tenantId: tenant.id,
            notificationType: 'anniversary',
            targetEntityType: 'member',
            targetEntityId: member.member_id,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error(`[ScheduledEventsService] Failed to get anniversaries for tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      result.errors.push(`Anniversaries for ${tenant.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process calendar reminder notifications for a tenant.
   */
  private async processCalendarReminders(
    tenant: Tenant,
    result: JobRunResult
  ): Promise<void> {
    try {
      const reminders = await this.scheduledNotificationRepository.getPendingCalendarReminders(tenant.id);

      if (!reminders || reminders.length === 0) {
        console.log(`[ScheduledEventsService] No pending reminders for tenant: ${tenant.name}`);
        return;
      }

      console.log(`[ScheduledEventsService] Found ${reminders.length} pending reminders for tenant: ${tenant.name}`);

      for (const reminder of reminders) {
        try {
          // Send calendar reminder notification
          await this.sendCalendarReminderNotification(tenant, reminder);

          // Mark reminder as sent in calendar_event_reminders table
          await this.scheduledNotificationRepository.markReminderAsSent(reminder.reminder_id);

          // Log successful send
          await this.scheduledNotificationRepository.logNotification({
            tenantId: tenant.id,
            notificationType: 'calendar_reminder',
            targetEntityType: 'calendar_reminder',
            targetEntityId: reminder.reminder_id,
            status: 'sent',
            recipientUserId: reminder.recipient_id,
            channelsUsed: [reminder.notification_type || 'in_app'],
            metadata: { event_id: reminder.event_id, event_title: reminder.event_title },
          });

          result.notificationsSent++;
          result.details.reminders.sent++;

        } catch (error) {
          const errorMsg = `Calendar reminder for event "${reminder.event_title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`[ScheduledEventsService] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.notificationsFailed++;
          result.details.reminders.failed++;

          await this.scheduledNotificationRepository.logNotification({
            tenantId: tenant.id,
            notificationType: 'calendar_reminder',
            targetEntityType: 'calendar_reminder',
            targetEntityId: reminder.reminder_id,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error(`[ScheduledEventsService] Failed to get reminders for tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      result.errors.push(`Reminders for ${tenant.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // NOTIFICATION SENDING METHODS
  // ============================================================================

  /**
   * Send birthday notification to a member.
   */
  private async sendBirthdayNotification(tenant: Tenant, member: MemberBirthday): Promise<void> {
    if (!member.email && !member.user_id) {
      throw new Error('Member has no email or user account');
    }

    await this.notificationBus.publish({
      id: randomUUID(),
      eventType: NotificationEventType.MEMBER_BIRTHDAY,
      category: 'member',
      priority: 'normal',
      tenantId: tenant.id,
      recipient: {
        userId: member.user_id || '',
        email: member.email || undefined,
        phone: member.contact_number || undefined,
      },
      payload: {
        title: `Happy Birthday, ${member.first_name}!`,
        message: `Wishing you a blessed birthday filled with joy and God's love!`,
        recipientName: member.first_name,
        memberPhotoUrl: member.profile_picture_url,
        age: member.age,
        profileUrl: `/members/${member.member_id}`,
        emailTemplate: 'birthday-greeting',
        tenantName: tenant.name,
      },
      channels: member.user_id ? ['in_app', 'email'] : ['email'],
    });

    console.log(`[ScheduledEventsService] Sent birthday notification to ${member.first_name} ${member.last_name}`);
  }

  /**
   * Send anniversary notification to a member.
   */
  private async sendAnniversaryNotification(tenant: Tenant, member: MemberAnniversary): Promise<void> {
    if (!member.email && !member.user_id) {
      throw new Error('Member has no email or user account');
    }

    await this.notificationBus.publish({
      id: randomUUID(),
      eventType: NotificationEventType.MEMBER_ANNIVERSARY,
      category: 'member',
      priority: 'normal',
      tenantId: tenant.id,
      recipient: {
        userId: member.user_id || '',
        email: member.email || undefined,
        phone: member.contact_number || undefined,
      },
      payload: {
        title: `Happy Anniversary, ${member.first_name}!`,
        message: `Congratulations on ${member.years} years! May God continue to bless your marriage.`,
        recipientName: member.first_name,
        years: member.years,
        profileUrl: `/members/${member.member_id}`,
        emailTemplate: 'anniversary-greeting',
        tenantName: tenant.name,
      },
      channels: member.user_id ? ['in_app', 'email'] : ['email'],
    });

    console.log(`[ScheduledEventsService] Sent anniversary notification to ${member.first_name} ${member.last_name}`);
  }

  /**
   * Send calendar reminder notification.
   */
  private async sendCalendarReminderNotification(tenant: Tenant, reminder: CalendarReminder): Promise<void> {
    if (!reminder.recipient_id) {
      throw new Error('Reminder has no recipient');
    }

    const eventDate = new Date(reminder.event_start_at);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    await this.notificationBus.publish({
      id: randomUUID(),
      eventType: NotificationEventType.EVENT_REMINDER,
      category: 'event',
      priority: 'normal',
      tenantId: tenant.id,
      recipient: {
        userId: reminder.recipient_id,
      },
      payload: {
        title: `Reminder: ${reminder.event_title}`,
        message: `Your event "${reminder.event_title}" is coming up on ${formattedDate}.`,
        eventId: reminder.event_id,
        eventTitle: reminder.event_title,
        eventStartAt: reminder.event_start_at,
        actionType: 'redirect',
        actionPayload: `/admin/planning/calendar?event=${reminder.event_id}`,
        tenantName: tenant.name,
      },
      channels: reminder.notification_type ? [reminder.notification_type as 'in_app' | 'email'] : ['in_app'],
    });

    console.log(`[ScheduledEventsService] Sent calendar reminder for "${reminder.event_title}"`);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Log job completion.
   */
  private async logJobComplete(jobId: string, result: JobRunResult): Promise<void> {
    try {
      await this.scheduledNotificationRepository.updateJobRun(jobId, {
        status: result.status,
        completedAt: new Date().toISOString(),
        durationMs: result.durationMs,
        tenantsProcessed: result.tenantsProcessed,
        notificationsSent: result.notificationsSent,
        notificationsSkipped: result.notificationsSkipped,
        notificationsFailed: result.notificationsFailed,
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
        details: result.details,
      });
    } catch (error) {
      console.error(`[ScheduledEventsService] Failed to log job completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
