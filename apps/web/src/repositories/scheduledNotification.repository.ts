/**
 * ================================================================================
 * SCHEDULED NOTIFICATION REPOSITORY
 * ================================================================================
 *
 * Repository for scheduled notification operations.
 * Delegates to ScheduledNotificationAdapter for database operations.
 *
 * ================================================================================
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IScheduledNotificationAdapter,
  MemberBirthday,
  MemberAnniversary,
  CalendarReminder,
  Tenant,
  LogNotificationParams,
  JobRunUpdateParams,
} from '@/adapters/scheduledNotification.adapter';

// ============================================================================
// INTERFACE
// ============================================================================

export interface IScheduledNotificationRepository {
  // Tenant queries
  getAllActiveTenants(): Promise<Tenant[]>;

  // Member queries
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
// REPOSITORY IMPLEMENTATION
// ============================================================================

@injectable()
export class ScheduledNotificationRepository implements IScheduledNotificationRepository {
  constructor(
    @inject(TYPES.IScheduledNotificationAdapter)
    private readonly adapter: IScheduledNotificationAdapter
  ) {}

  async getAllActiveTenants(): Promise<Tenant[]> {
    return this.adapter.getAllActiveTenants();
  }

  async getMembersWithBirthdayToday(tenantId: string): Promise<MemberBirthday[]> {
    return this.adapter.getMembersWithBirthdayToday(tenantId);
  }

  async getMembersWithAnniversaryToday(tenantId: string): Promise<MemberAnniversary[]> {
    return this.adapter.getMembersWithAnniversaryToday(tenantId);
  }

  async getPendingCalendarReminders(tenantId: string): Promise<CalendarReminder[]> {
    return this.adapter.getPendingCalendarReminders(tenantId);
  }

  async wasNotificationSent(
    tenantId: string,
    notificationType: string,
    targetEntityType: string,
    targetEntityId: string
  ): Promise<boolean> {
    return this.adapter.wasNotificationSent(
      tenantId,
      notificationType,
      targetEntityType,
      targetEntityId
    );
  }

  async logNotification(params: LogNotificationParams): Promise<void> {
    return this.adapter.logNotification(params);
  }

  async markReminderAsSent(reminderId: string): Promise<void> {
    return this.adapter.markReminderAsSent(reminderId);
  }

  async createJobRun(jobId: string, jobType: string, triggeredBy: string): Promise<void> {
    return this.adapter.createJobRun(jobId, jobType, triggeredBy);
  }

  async updateJobRun(jobId: string, params: JobRunUpdateParams): Promise<void> {
    return this.adapter.updateJobRun(jobId, params);
  }

  async cleanupOldLogs(): Promise<number> {
    return this.adapter.cleanupOldLogs();
  }
}
