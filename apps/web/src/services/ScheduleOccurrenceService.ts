import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import type { IScheduleOccurrenceRepository } from '@/repositories/scheduleOccurrence.repository';
import type { ICalendarEventAdapter } from '@/adapters/calendarEvent.adapter';
import type {
  ScheduleOccurrence,
  ScheduleOccurrenceWithSchedule,
  ScheduleOccurrenceUpdateInput,
  ScheduleOccurrenceFilters,
  ScheduleOccurrenceView,
  OccurrenceStatus,
} from '@/models/scheduler/scheduleOccurrence.model';

const STATUS_LABELS: Record<OccurrenceStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface IScheduleOccurrenceService {
  // Occurrence CRUD
  getById(id: string, tenantId?: string): Promise<ScheduleOccurrenceWithSchedule | null>;
  getBySchedule(scheduleId: string, tenantId?: string): Promise<ScheduleOccurrence[]>;
  getByDateRange(startDate: string, endDate: string, tenantId?: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  getByFilters(filters: ScheduleOccurrenceFilters, tenantId?: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  getUpcoming(days: number, tenantId?: string): Promise<ScheduleOccurrenceWithSchedule[]>;
  updateOccurrence(id: string, data: ScheduleOccurrenceUpdateInput, tenantId?: string): Promise<ScheduleOccurrence>;

  // Status Management
  cancelOccurrence(id: string, reason: string, tenantId?: string): Promise<ScheduleOccurrence>;
  startOccurrence(id: string, tenantId?: string): Promise<ScheduleOccurrence>;
  completeOccurrence(id: string, tenantId?: string): Promise<ScheduleOccurrence>;

  // QR Code Management
  generateQrToken(id: string, expiresInHours: number, tenantId?: string): Promise<{ token: string; expiresAt: string }>;
  getByQrToken(token: string): Promise<ScheduleOccurrenceWithSchedule | null>;
  validateQrToken(token: string): Promise<{ valid: boolean; occurrence?: ScheduleOccurrenceWithSchedule; error?: string }>;

  // Calendar Integration
  syncToCalendar(occurrenceId: string): Promise<boolean>;
  syncAllToCalendar(): Promise<number>;
  removeFromCalendar(occurrenceId: string): Promise<boolean>;

  // View Transformation
  toOccurrenceView(occurrence: ScheduleOccurrenceWithSchedule): ScheduleOccurrenceView;
  toOccurrenceViewList(occurrences: ScheduleOccurrenceWithSchedule[]): ScheduleOccurrenceView[];
}

@injectable()
export class ScheduleOccurrenceService implements IScheduleOccurrenceService {
  constructor(
    @inject(TYPES.IScheduleOccurrenceRepository) private occurrenceRepository: IScheduleOccurrenceRepository,
    @inject(TYPES.ICalendarEventAdapter) private calendarEventAdapter: ICalendarEventAdapter
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  // ==================== Occurrence CRUD ====================

  async getById(id: string, tenantId?: string): Promise<ScheduleOccurrenceWithSchedule | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.occurrenceRepository.getById(id, effectiveTenantId);
  }

  async getBySchedule(scheduleId: string, tenantId?: string): Promise<ScheduleOccurrence[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.occurrenceRepository.getBySchedule(scheduleId, effectiveTenantId);
  }

  async getByDateRange(startDate: string, endDate: string, tenantId?: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.occurrenceRepository.getByDateRange(startDate, endDate, effectiveTenantId);
  }

  async getByFilters(filters: ScheduleOccurrenceFilters, tenantId?: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.occurrenceRepository.getByFilters(filters, effectiveTenantId);
  }

  async getUpcoming(days: number, tenantId?: string): Promise<ScheduleOccurrenceWithSchedule[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.occurrenceRepository.getUpcoming(days, effectiveTenantId);
  }

  async updateOccurrence(id: string, data: ScheduleOccurrenceUpdateInput, tenantId?: string): Promise<ScheduleOccurrence> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.occurrenceRepository.updateOccurrence(id, data, effectiveTenantId);
  }

  // ==================== Status Management ====================

  async cancelOccurrence(id: string, reason: string, tenantId?: string): Promise<ScheduleOccurrence> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const occurrence = await this.occurrenceRepository.getById(id, effectiveTenantId);
    if (!occurrence) {
      throw new Error('Occurrence not found');
    }

    if (occurrence.status === 'cancelled') {
      throw new Error('Occurrence is already cancelled');
    }

    if (occurrence.status === 'completed') {
      throw new Error('Cannot cancel a completed occurrence');
    }

    const result = await this.occurrenceRepository.updateOccurrence(
      id,
      { status: 'cancelled', cancellation_reason: reason },
      effectiveTenantId
    );

    // Sync cancellation to calendar (mark as cancelled)
    await this.syncToCalendar(id).catch(err => {
      console.error('[cancelOccurrence] Failed to sync to calendar:', err.message);
    });

    return result;
  }

  async startOccurrence(id: string, tenantId?: string): Promise<ScheduleOccurrence> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const occurrence = await this.occurrenceRepository.getById(id, effectiveTenantId);
    if (!occurrence) {
      throw new Error('Occurrence not found');
    }

    if (occurrence.status !== 'scheduled') {
      throw new Error(`Cannot start occurrence with status '${occurrence.status}'`);
    }

    const result = await this.occurrenceRepository.updateOccurrence(
      id,
      { status: 'in_progress' },
      effectiveTenantId
    );

    // Sync status change to calendar
    await this.syncToCalendar(id).catch(err => {
      console.error('[startOccurrence] Failed to sync to calendar:', err.message);
    });

    return result;
  }

  async completeOccurrence(id: string, tenantId?: string): Promise<ScheduleOccurrence> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const occurrence = await this.occurrenceRepository.getById(id, effectiveTenantId);
    if (!occurrence) {
      throw new Error('Occurrence not found');
    }

    if (occurrence.status === 'cancelled') {
      throw new Error('Cannot complete a cancelled occurrence');
    }

    const result = await this.occurrenceRepository.updateOccurrence(
      id,
      { status: 'completed' },
      effectiveTenantId
    );

    // Sync completion to calendar
    await this.syncToCalendar(id).catch(err => {
      console.error('[completeOccurrence] Failed to sync to calendar:', err.message);
    });

    return result;
  }

  // ==================== QR Code Management ====================

  async generateQrToken(id: string, expiresInHours: number = 24, tenantId?: string): Promise<{ token: string; expiresAt: string }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const occurrence = await this.occurrenceRepository.getById(id, effectiveTenantId);
    if (!occurrence) {
      throw new Error('Occurrence not found');
    }

    // Generate a unique token using UUID
    const token = crypto.randomUUID();

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    const expiresAtISO = expiresAt.toISOString();

    await this.occurrenceRepository.updateOccurrence(
      id,
      { qr_token: token, qr_expires_at: expiresAtISO },
      effectiveTenantId
    );

    return { token, expiresAt: expiresAtISO };
  }

  async getByQrToken(token: string): Promise<ScheduleOccurrenceWithSchedule | null> {
    return await this.occurrenceRepository.getByQrToken(token);
  }

  async validateQrToken(token: string): Promise<{ valid: boolean; occurrence?: ScheduleOccurrenceWithSchedule; error?: string }> {
    const occurrence = await this.occurrenceRepository.getByQrToken(token);

    if (!occurrence) {
      return { valid: false, error: 'Invalid QR code' };
    }

    // Check expiration
    if (occurrence.qr_expires_at) {
      const expiresAt = new Date(occurrence.qr_expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, error: 'QR code has expired' };
      }
    }

    // Check occurrence status
    if (occurrence.status === 'cancelled') {
      return { valid: false, error: 'Event has been cancelled' };
    }

    if (occurrence.status === 'completed') {
      return { valid: false, error: 'Event has already ended' };
    }

    return { valid: true, occurrence };
  }

  // ==================== Calendar Integration ====================

  /**
   * Sync a single occurrence to the planning calendar
   * Creates or updates the corresponding calendar event
   */
  async syncToCalendar(occurrenceId: string): Promise<boolean> {
    try {
      return await this.calendarEventAdapter.syncSingleOccurrence(occurrenceId);
    } catch (error) {
      console.error('[ScheduleOccurrenceService.syncToCalendar] Failed:', error);
      return false;
    }
  }

  /**
   * Sync all upcoming occurrences to the planning calendar
   * Useful for bulk sync or initial setup
   */
  async syncAllToCalendar(): Promise<number> {
    try {
      return await this.calendarEventAdapter.syncFromScheduleOccurrences();
    } catch (error) {
      console.error('[ScheduleOccurrenceService.syncAllToCalendar] Failed:', error);
      return 0;
    }
  }

  /**
   * Remove an occurrence from the calendar
   * Used when an occurrence is deleted (soft delete calendar event)
   */
  async removeFromCalendar(occurrenceId: string): Promise<boolean> {
    try {
      return await this.calendarEventAdapter.deleteBySource('schedule_occurrence', occurrenceId);
    } catch (error) {
      console.error('[ScheduleOccurrenceService.removeFromCalendar] Failed:', error);
      return false;
    }
  }

  // ==================== View Transformation ====================

  toOccurrenceView(occurrence: ScheduleOccurrenceWithSchedule): ScheduleOccurrenceView {
    const schedule = occurrence.schedule;
    const title = occurrence.override_name || schedule.name;
    const description = occurrence.override_description || schedule.description;
    const location = occurrence.override_location || schedule.location;
    const capacity = occurrence.override_capacity ?? schedule.capacity;

    const availableSpots = capacity != null
      ? Math.max(0, capacity - occurrence.registered_count)
      : null;

    return {
      id: occurrence.id,
      scheduleId: occurrence.schedule_id,
      scheduleName: schedule.name,
      ministryId: schedule.ministry.id,
      ministryName: schedule.ministry.name,
      ministryColor: schedule.ministry.color,
      ministryIcon: schedule.ministry.icon,
      title,
      description,
      occurrenceDate: new Date(occurrence.occurrence_date),
      startAt: new Date(occurrence.start_at),
      endAt: occurrence.end_at ? new Date(occurrence.end_at) : null,
      location,
      locationType: schedule.location_type,
      virtualMeetingUrl: schedule.virtual_meeting_url,
      capacity,
      status: occurrence.status,
      statusLabel: STATUS_LABELS[occurrence.status],
      cancellationReason: occurrence.cancellation_reason,
      registeredCount: occurrence.registered_count,
      waitlistCount: occurrence.waitlist_count,
      checkedInCount: occurrence.checked_in_count,
      availableSpots,
      registrationRequired: schedule.registration_required,
      hasQrCode: !!occurrence.qr_token,
    };
  }

  toOccurrenceViewList(occurrences: ScheduleOccurrenceWithSchedule[]): ScheduleOccurrenceView[] {
    return occurrences.map(o => this.toOccurrenceView(o));
  }
}
