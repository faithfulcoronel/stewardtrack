import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import type { IScheduleAttendanceRepository } from '@/repositories/scheduleAttendance.repository';
import type { IScheduleOccurrenceRepository } from '@/repositories/scheduleOccurrence.repository';
import type { IScheduleRegistrationRepository } from '@/repositories/scheduleRegistration.repository';
import type {
  ScheduleAttendance,
  ScheduleAttendanceWithMember,
  ScheduleAttendanceCreateInput,
  ScheduleAttendanceFilters,
  ScheduleAttendanceView,
  AttendanceStats,
  CheckinMethod,
} from '@/models/scheduler/scheduleAttendance.model';

const CHECKIN_METHOD_LABELS: Record<CheckinMethod, string> = {
  staff_scan: 'Staff Scan',
  self_checkin: 'Self Check-in',
  manual: 'Manual Entry',
};

export interface IScheduleAttendanceService {
  // Attendance CRUD
  getById(id: string, tenantId?: string): Promise<ScheduleAttendanceWithMember | null>;
  getByOccurrence(occurrenceId: string, tenantId?: string): Promise<ScheduleAttendanceWithMember[]>;
  getByMember(memberId: string, tenantId?: string): Promise<ScheduleAttendance[]>;
  getByFilters(filters: ScheduleAttendanceFilters, tenantId?: string): Promise<ScheduleAttendanceWithMember[]>;

  // Check-in Operations
  checkInMember(occurrenceId: string, memberId: string, method: CheckinMethod, userId?: string, tenantId?: string): Promise<ScheduleAttendance>;
  checkInGuest(occurrenceId: string, guestName: string, method: CheckinMethod, userId?: string, tenantId?: string): Promise<ScheduleAttendance>;
  checkInByRegistration(registrationId: string, method: CheckinMethod, userId?: string, tenantId?: string): Promise<ScheduleAttendance>;
  checkInByQrCode(qrToken: string, memberId?: string, guestName?: string, tenantId?: string): Promise<ScheduleAttendance>;
  checkOut(id: string, tenantId?: string): Promise<ScheduleAttendance>;
  deleteAttendance(id: string, tenantId?: string): Promise<void>;

  // Validation
  canCheckIn(occurrenceId: string, memberId?: string, tenantId?: string): Promise<{ canCheckIn: boolean; reason?: string }>;
  isAlreadyCheckedIn(occurrenceId: string, memberId: string, tenantId?: string): Promise<boolean>;

  // Statistics
  getAttendanceStats(occurrenceId: string, tenantId?: string): Promise<AttendanceStats>;
  getAttendanceCount(occurrenceId: string, tenantId?: string): Promise<number>;

  // View Transformation
  toAttendanceView(attendance: ScheduleAttendanceWithMember): ScheduleAttendanceView;
  toAttendanceViewList(attendances: ScheduleAttendanceWithMember[]): ScheduleAttendanceView[];
}

@injectable()
export class ScheduleAttendanceService implements IScheduleAttendanceService {
  constructor(
    @inject(TYPES.IScheduleAttendanceRepository) private attendanceRepository: IScheduleAttendanceRepository,
    @inject(TYPES.IScheduleOccurrenceRepository) private occurrenceRepository: IScheduleOccurrenceRepository,
    @inject(TYPES.IScheduleRegistrationRepository) private registrationRepository: IScheduleRegistrationRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  // ==================== Attendance CRUD ====================

  async getById(id: string, tenantId?: string): Promise<ScheduleAttendanceWithMember | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.attendanceRepository.getById(id, effectiveTenantId);
  }

  async getByOccurrence(occurrenceId: string, tenantId?: string): Promise<ScheduleAttendanceWithMember[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.attendanceRepository.getByOccurrence(occurrenceId, effectiveTenantId);
  }

  async getByMember(memberId: string, tenantId?: string): Promise<ScheduleAttendance[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.attendanceRepository.getByMember(memberId, effectiveTenantId);
  }

  async getByFilters(filters: ScheduleAttendanceFilters, tenantId?: string): Promise<ScheduleAttendanceWithMember[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.attendanceRepository.getByFilters(filters, effectiveTenantId);
  }

  // ==================== Check-in Operations ====================

  async checkInMember(
    occurrenceId: string,
    memberId: string,
    method: CheckinMethod,
    userId?: string,
    tenantId?: string
  ): Promise<ScheduleAttendance> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Validate check-in eligibility
    const canCheckInResult = await this.canCheckIn(occurrenceId, memberId, effectiveTenantId);
    if (!canCheckInResult.canCheckIn) {
      throw new Error(canCheckInResult.reason || 'Cannot check in');
    }

    // Find related registration if exists
    const registrations = await this.registrationRepository.getByFilters(
      { occurrenceId, memberId, statuses: ['registered', 'waitlisted'] },
      effectiveTenantId
    );
    const registration = registrations[0];

    const attendanceData: ScheduleAttendanceCreateInput = {
      occurrence_id: occurrenceId,
      member_id: memberId,
      registration_id: registration?.id ?? null,
      checkin_method: method,
      device_info: {},
    };

    const attendance = await this.attendanceRepository.createAttendance(attendanceData, effectiveTenantId, userId);

    // Update registration status if applicable
    if (registration) {
      await this.registrationRepository.updateRegistration(
        registration.id,
        { status: 'checked_in' },
        effectiveTenantId
      );
    }

    // Update occurrence checked_in_count
    await this.updateOccurrenceCheckedInCount(occurrenceId, effectiveTenantId);

    return attendance;
  }

  async checkInGuest(
    occurrenceId: string,
    guestName: string,
    method: CheckinMethod,
    userId?: string,
    tenantId?: string
  ): Promise<ScheduleAttendance> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Validate occurrence
    const occurrence = await this.occurrenceRepository.getById(occurrenceId, effectiveTenantId);
    if (!occurrence) {
      throw new Error('Event not found');
    }

    if (occurrence.status === 'cancelled') {
      throw new Error('Event has been cancelled');
    }

    const attendanceData: ScheduleAttendanceCreateInput = {
      occurrence_id: occurrenceId,
      guest_name: guestName,
      checkin_method: method,
      device_info: {},
    };

    const attendance = await this.attendanceRepository.createAttendance(attendanceData, effectiveTenantId, userId);

    // Update occurrence checked_in_count
    await this.updateOccurrenceCheckedInCount(occurrenceId, effectiveTenantId);

    return attendance;
  }

  async checkInByRegistration(
    registrationId: string,
    method: CheckinMethod,
    userId?: string,
    tenantId?: string
  ): Promise<ScheduleAttendance> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Get the registration
    const registration = await this.registrationRepository.getById(registrationId, effectiveTenantId);
    if (!registration) {
      throw new Error('Registration not found');
    }

    if (registration.status === 'cancelled') {
      throw new Error('Registration has been cancelled');
    }

    if (registration.status === 'checked_in') {
      throw new Error('Already checked in');
    }

    // Check if already checked in (via attendance record)
    if (registration.member_id) {
      const existingAttendance = await this.attendanceRepository.getByOccurrenceAndMember(
        registration.occurrence_id,
        registration.member_id,
        effectiveTenantId
      );
      if (existingAttendance) {
        throw new Error('Already checked in');
      }
    }

    const attendanceData: ScheduleAttendanceCreateInput = {
      occurrence_id: registration.occurrence_id,
      member_id: registration.member_id,
      registration_id: registrationId,
      guest_name: registration.guest_name,
      checkin_method: method,
      device_info: {},
    };

    const attendance = await this.attendanceRepository.createAttendance(attendanceData, effectiveTenantId, userId);

    // Update registration status
    await this.registrationRepository.updateRegistration(
      registrationId,
      { status: 'checked_in' },
      effectiveTenantId
    );

    // Update occurrence checked_in_count
    await this.updateOccurrenceCheckedInCount(registration.occurrence_id, effectiveTenantId);

    return attendance;
  }

  async checkInByQrCode(
    qrToken: string,
    memberId?: string,
    guestName?: string,
    tenantId?: string
  ): Promise<ScheduleAttendance> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Validate QR token
    const occurrence = await this.occurrenceRepository.getByQrToken(qrToken);
    if (!occurrence) {
      throw new Error('Invalid QR code');
    }

    // Check expiration
    if (occurrence.qr_expires_at) {
      const expiresAt = new Date(occurrence.qr_expires_at);
      if (expiresAt < new Date()) {
        throw new Error('QR code has expired');
      }
    }

    // Check occurrence status
    if (occurrence.status === 'cancelled') {
      throw new Error('Event has been cancelled');
    }

    // Determine check-in type
    if (memberId) {
      return await this.checkInMember(occurrence.id, memberId, 'self_checkin', undefined, effectiveTenantId);
    } else if (guestName) {
      return await this.checkInGuest(occurrence.id, guestName, 'self_checkin', undefined, effectiveTenantId);
    } else {
      throw new Error('Either member ID or guest name is required');
    }
  }

  async checkOut(id: string, tenantId?: string): Promise<ScheduleAttendance> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.attendanceRepository.checkout(id, effectiveTenantId);
  }

  async deleteAttendance(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const attendance = await this.attendanceRepository.getById(id, effectiveTenantId);
    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    await this.attendanceRepository.deleteAttendance(id, effectiveTenantId);

    // Update occurrence checked_in_count
    await this.updateOccurrenceCheckedInCount(attendance.occurrence_id, effectiveTenantId);
  }

  // ==================== Validation ====================

  async canCheckIn(occurrenceId: string, memberId?: string, tenantId?: string): Promise<{ canCheckIn: boolean; reason?: string }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Get the occurrence
    const occurrence = await this.occurrenceRepository.getById(occurrenceId, effectiveTenantId);
    if (!occurrence) {
      return { canCheckIn: false, reason: 'Event not found' };
    }

    // Check if occurrence is active
    if (occurrence.status === 'cancelled') {
      return { canCheckIn: false, reason: 'Event has been cancelled' };
    }

    if (occurrence.status === 'completed') {
      return { canCheckIn: false, reason: 'Event has already ended' };
    }

    // Check if member is already checked in
    if (memberId) {
      const existingAttendance = await this.attendanceRepository.getByOccurrenceAndMember(
        occurrenceId,
        memberId,
        effectiveTenantId
      );
      if (existingAttendance) {
        return { canCheckIn: false, reason: 'Already checked in' };
      }
    }

    return { canCheckIn: true };
  }

  async isAlreadyCheckedIn(occurrenceId: string, memberId: string, tenantId?: string): Promise<boolean> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const attendance = await this.attendanceRepository.getByOccurrenceAndMember(
      occurrenceId,
      memberId,
      effectiveTenantId
    );
    return attendance !== null;
  }

  // ==================== Statistics ====================

  async getAttendanceStats(occurrenceId: string, tenantId?: string): Promise<AttendanceStats> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Get occurrence for capacity
    const occurrence = await this.occurrenceRepository.getById(occurrenceId, effectiveTenantId);
    if (!occurrence) {
      throw new Error('Occurrence not found');
    }

    // Get attendance records
    const attendances = await this.attendanceRepository.getByOccurrence(occurrenceId, effectiveTenantId);
    const totalCheckedIn = attendances.length;

    // Get registered count
    const registrationCounts = await this.registrationRepository.getRegistrationCount(occurrenceId, effectiveTenantId);
    const totalRegistered = registrationCounts.registered;

    // Get capacity
    const capacity = occurrence.override_capacity ?? occurrence.schedule.capacity;

    // Calculate attendance rate
    const attendanceRate = totalRegistered > 0 ? (totalCheckedIn / totalRegistered) * 100 : 0;

    // Get breakdown by method
    const methodCounts = await this.attendanceRepository.getAttendanceByMethod(occurrenceId, effectiveTenantId);
    const byMethod = {
      staff_scan: 0,
      self_checkin: 0,
      manual: 0,
    };
    for (const mc of methodCounts) {
      if (mc.method in byMethod) {
        byMethod[mc.method as CheckinMethod] = mc.count;
      }
    }

    // Get recent check-ins (last 10)
    const recentAttendances = attendances.slice(0, 10);
    const recentCheckins = recentAttendances.map(a => this.toAttendanceView(a));

    return {
      totalCheckedIn,
      totalRegistered,
      totalCapacity: capacity,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      byMethod,
      recentCheckins,
    };
  }

  async getAttendanceCount(occurrenceId: string, tenantId?: string): Promise<number> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.attendanceRepository.getAttendanceCount(occurrenceId, effectiveTenantId);
  }

  // ==================== View Transformation ====================

  toAttendanceView(attendance: ScheduleAttendanceWithMember): ScheduleAttendanceView {
    const isGuest = !attendance.member_id;
    const memberName = attendance.member
      ? `${attendance.member.first_name} ${attendance.member.last_name}`
      : null;
    const checkedInByName = attendance.checked_in_by_user?.raw_user_meta_data?.full_name
      || attendance.checked_in_by_user?.email
      || null;

    const checkedInAt = new Date(attendance.checked_in_at);
    const checkedOutAt = attendance.checked_out_at ? new Date(attendance.checked_out_at) : null;

    // Calculate duration in minutes
    let duration: number | null = null;
    if (checkedOutAt) {
      duration = Math.round((checkedOutAt.getTime() - checkedInAt.getTime()) / (1000 * 60));
    }

    return {
      id: attendance.id,
      occurrenceId: attendance.occurrence_id,
      memberId: attendance.member_id,
      memberName,
      memberEmail: attendance.member?.email ?? null,
      memberAvatarUrl: attendance.member?.avatar_url ?? null,
      guestName: attendance.guest_name,
      displayName: memberName || attendance.guest_name || 'Unknown',
      isGuest,
      registrationId: attendance.registration_id,
      checkedInAt,
      checkedInByName,
      checkinMethod: attendance.checkin_method,
      checkinMethodLabel: CHECKIN_METHOD_LABELS[attendance.checkin_method],
      checkedOutAt,
      duration,
    };
  }

  toAttendanceViewList(attendances: ScheduleAttendanceWithMember[]): ScheduleAttendanceView[] {
    return attendances.map(a => this.toAttendanceView(a));
  }

  // ==================== Private Helpers ====================

  private async updateOccurrenceCheckedInCount(occurrenceId: string, tenantId: string): Promise<void> {
    const count = await this.attendanceRepository.getAttendanceCount(occurrenceId, tenantId);
    await this.occurrenceRepository.updateCounts(occurrenceId, { checked_in_count: count });
  }
}
