import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import type { IScheduleRegistrationRepository } from '@/repositories/scheduleRegistration.repository';
import type { IScheduleOccurrenceRepository } from '@/repositories/scheduleOccurrence.repository';
import type {
  ScheduleRegistration,
  ScheduleRegistrationWithMember,
  ScheduleRegistrationCreateInput,
  ScheduleRegistrationUpdateInput,
  ScheduleRegistrationFilters,
  ScheduleRegistrationView,
  RegistrationStatus,
  GuestRegistrationInput,
} from '@/models/scheduler/scheduleRegistration.model';

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  registered: 'Registered',
  waitlisted: 'Waitlisted',
  cancelled: 'Cancelled',
  checked_in: 'Checked In',
  no_show: 'No Show',
};

export interface IScheduleRegistrationService {
  // Registration CRUD
  getById(id: string, tenantId?: string): Promise<ScheduleRegistrationWithMember | null>;
  getByOccurrence(occurrenceId: string, tenantId?: string): Promise<ScheduleRegistrationWithMember[]>;
  getByMember(memberId: string, tenantId?: string): Promise<ScheduleRegistration[]>;
  getByFilters(filters: ScheduleRegistrationFilters, tenantId?: string): Promise<ScheduleRegistrationWithMember[]>;
  getWaitlist(occurrenceId: string, tenantId?: string): Promise<ScheduleRegistrationWithMember[]>;

  // Registration Operations
  registerMember(occurrenceId: string, memberId: string, data?: Partial<ScheduleRegistrationCreateInput>, tenantId?: string): Promise<ScheduleRegistration>;
  registerGuest(data: GuestRegistrationInput, tenantId?: string): Promise<ScheduleRegistration>;
  updateRegistration(id: string, data: ScheduleRegistrationUpdateInput, tenantId?: string): Promise<ScheduleRegistration>;
  cancelRegistration(id: string, tenantId?: string): Promise<void>;

  // Waitlist Management
  checkCapacityAndWaitlist(occurrenceId: string, tenantId?: string): Promise<{ hasCapacity: boolean; shouldWaitlist: boolean; position?: number }>;
  promoteFromWaitlist(occurrenceId: string, tenantId?: string): Promise<ScheduleRegistration | null>;

  // Validation
  canRegister(occurrenceId: string, memberId?: string, guestEmail?: string, tenantId?: string): Promise<{ canRegister: boolean; reason?: string }>;
  getRegistrationCount(occurrenceId: string, tenantId?: string): Promise<{ registered: number; waitlisted: number }>;

  // View Transformation
  toRegistrationView(registration: ScheduleRegistrationWithMember): ScheduleRegistrationView;
  toRegistrationViewList(registrations: ScheduleRegistrationWithMember[]): ScheduleRegistrationView[];
}

@injectable()
export class ScheduleRegistrationService implements IScheduleRegistrationService {
  constructor(
    @inject(TYPES.IScheduleRegistrationRepository) private registrationRepository: IScheduleRegistrationRepository,
    @inject(TYPES.IScheduleOccurrenceRepository) private occurrenceRepository: IScheduleOccurrenceRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  // ==================== Registration CRUD ====================

  async getById(id: string, tenantId?: string): Promise<ScheduleRegistrationWithMember | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.registrationRepository.getById(id, effectiveTenantId);
  }

  async getByOccurrence(occurrenceId: string, tenantId?: string): Promise<ScheduleRegistrationWithMember[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.registrationRepository.getByOccurrence(occurrenceId, effectiveTenantId);
  }

  async getByMember(memberId: string, tenantId?: string): Promise<ScheduleRegistration[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.registrationRepository.getByMember(memberId, effectiveTenantId);
  }

  async getByFilters(filters: ScheduleRegistrationFilters, tenantId?: string): Promise<ScheduleRegistrationWithMember[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.registrationRepository.getByFilters(filters, effectiveTenantId);
  }

  async getWaitlist(occurrenceId: string, tenantId?: string): Promise<ScheduleRegistrationWithMember[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.registrationRepository.getWaitlist(occurrenceId, effectiveTenantId);
  }

  // ==================== Registration Operations ====================

  async registerMember(
    occurrenceId: string,
    memberId: string,
    data?: Partial<ScheduleRegistrationCreateInput>,
    tenantId?: string
  ): Promise<ScheduleRegistration> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Validate registration eligibility
    const canRegisterResult = await this.canRegister(occurrenceId, memberId, undefined, effectiveTenantId);
    if (!canRegisterResult.canRegister) {
      throw new Error(canRegisterResult.reason || 'Cannot register for this event');
    }

    // Check capacity and determine if waitlisting
    const capacityCheck = await this.checkCapacityAndWaitlist(occurrenceId, effectiveTenantId);

    const registrationData: ScheduleRegistrationCreateInput = {
      occurrence_id: occurrenceId,
      member_id: memberId,
      party_size: data?.party_size ?? 1,
      form_responses: data?.form_responses ?? {},
      special_requests: data?.special_requests ?? null,
    };

    const registration = await this.registrationRepository.createRegistration(registrationData, effectiveTenantId);

    // If waitlisted, update status
    if (capacityCheck.shouldWaitlist) {
      return await this.registrationRepository.updateRegistration(
        registration.id,
        { status: 'waitlisted', waitlist_position: capacityCheck.position },
        effectiveTenantId
      );
    }

    // Update occurrence counts
    await this.updateOccurrenceCounts(occurrenceId, effectiveTenantId);

    return registration;
  }

  async registerGuest(data: GuestRegistrationInput, tenantId?: string): Promise<ScheduleRegistration> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Validate registration eligibility
    const canRegisterResult = await this.canRegister(data.occurrence_id, undefined, data.guest_email, effectiveTenantId);
    if (!canRegisterResult.canRegister) {
      throw new Error(canRegisterResult.reason || 'Cannot register for this event');
    }

    // Check capacity and determine if waitlisting
    const capacityCheck = await this.checkCapacityAndWaitlist(data.occurrence_id, effectiveTenantId);

    const registrationData: ScheduleRegistrationCreateInput = {
      occurrence_id: data.occurrence_id,
      guest_name: data.guest_name,
      guest_email: data.guest_email,
      guest_phone: data.guest_phone,
      party_size: data.party_size ?? 1,
      form_responses: data.form_responses ?? {},
      special_requests: data.special_requests ?? null,
    };

    const registration = await this.registrationRepository.createRegistration(registrationData, effectiveTenantId);

    // If waitlisted, update status
    if (capacityCheck.shouldWaitlist) {
      return await this.registrationRepository.updateRegistration(
        registration.id,
        { status: 'waitlisted', waitlist_position: capacityCheck.position },
        effectiveTenantId
      );
    }

    // Update occurrence counts
    await this.updateOccurrenceCounts(data.occurrence_id, effectiveTenantId);

    return registration;
  }

  async updateRegistration(id: string, data: ScheduleRegistrationUpdateInput, tenantId?: string): Promise<ScheduleRegistration> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const registration = await this.registrationRepository.updateRegistration(id, data, effectiveTenantId);

    // Update occurrence counts if status changed
    if (data.status) {
      const existing = await this.registrationRepository.getById(id, effectiveTenantId);
      if (existing) {
        await this.updateOccurrenceCounts(existing.occurrence_id, effectiveTenantId);
      }
    }

    return registration;
  }

  async cancelRegistration(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const registration = await this.registrationRepository.getById(id, effectiveTenantId);
    if (!registration) {
      throw new Error('Registration not found');
    }

    await this.registrationRepository.cancelRegistration(id, effectiveTenantId);

    // Update occurrence counts
    await this.updateOccurrenceCounts(registration.occurrence_id, effectiveTenantId);

    // Promote from waitlist if capacity available
    await this.promoteFromWaitlist(registration.occurrence_id, effectiveTenantId);
  }

  // ==================== Waitlist Management ====================

  async checkCapacityAndWaitlist(occurrenceId: string, tenantId?: string): Promise<{ hasCapacity: boolean; shouldWaitlist: boolean; position?: number }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const occurrence = await this.occurrenceRepository.getById(occurrenceId, effectiveTenantId);
    if (!occurrence) {
      throw new Error('Occurrence not found');
    }

    const capacity = occurrence.override_capacity ?? occurrence.schedule.capacity;
    const counts = await this.registrationRepository.getRegistrationCount(occurrenceId, effectiveTenantId);

    // If no capacity limit, always has capacity
    if (capacity === null || capacity === undefined) {
      return { hasCapacity: true, shouldWaitlist: false };
    }

    const hasCapacity = counts.registered < capacity;

    // If no capacity and waitlist enabled
    if (!hasCapacity && occurrence.schedule.registration_required) {
      // Check if schedule has waitlist enabled - we'll need to infer from schedule data
      // For now, assume waitlist is enabled if registration is required
      const waitlistPosition = counts.waitlisted + 1;
      return { hasCapacity: false, shouldWaitlist: true, position: waitlistPosition };
    }

    return { hasCapacity, shouldWaitlist: false };
  }

  async promoteFromWaitlist(occurrenceId: string, tenantId?: string): Promise<ScheduleRegistration | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Check if there's capacity
    const capacityCheck = await this.checkCapacityAndWaitlist(occurrenceId, effectiveTenantId);
    if (!capacityCheck.hasCapacity) {
      return null;
    }

    // Promote the first person from waitlist
    const promoted = await this.registrationRepository.promoteFromWaitlist(occurrenceId, effectiveTenantId);

    if (promoted) {
      // Update occurrence counts
      await this.updateOccurrenceCounts(occurrenceId, effectiveTenantId);
    }

    return promoted;
  }

  // ==================== Validation ====================

  async canRegister(
    occurrenceId: string,
    memberId?: string,
    guestEmail?: string,
    tenantId?: string
  ): Promise<{ canRegister: boolean; reason?: string }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Get the occurrence
    const occurrence = await this.occurrenceRepository.getById(occurrenceId, effectiveTenantId);
    if (!occurrence) {
      return { canRegister: false, reason: 'Event not found' };
    }

    // Check if occurrence is active
    if (occurrence.status === 'cancelled') {
      return { canRegister: false, reason: 'Event has been cancelled' };
    }

    if (occurrence.status === 'completed') {
      return { canRegister: false, reason: 'Event has already ended' };
    }

    // Check if already registered (member)
    if (memberId) {
      const existingRegistrations = await this.registrationRepository.getByFilters(
        { occurrenceId, memberId, statuses: ['registered', 'waitlisted'] },
        effectiveTenantId
      );
      if (existingRegistrations.length > 0) {
        return { canRegister: false, reason: 'Already registered for this event' };
      }
    }

    // Check if already registered (guest by email)
    if (guestEmail) {
      const existingGuest = await this.registrationRepository.getByGuestEmail(guestEmail, occurrenceId, effectiveTenantId);
      if (existingGuest && existingGuest.status !== 'cancelled') {
        return { canRegister: false, reason: 'This email is already registered for this event' };
      }
    }

    return { canRegister: true };
  }

  async getRegistrationCount(occurrenceId: string, tenantId?: string): Promise<{ registered: number; waitlisted: number }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.registrationRepository.getRegistrationCount(occurrenceId, effectiveTenantId);
  }

  // ==================== View Transformation ====================

  toRegistrationView(registration: ScheduleRegistrationWithMember): ScheduleRegistrationView {
    const isGuest = !registration.member_id;
    const memberName = registration.member
      ? `${registration.member.first_name} ${registration.member.last_name}`
      : null;

    return {
      id: registration.id,
      occurrenceId: registration.occurrence_id,
      memberId: registration.member_id,
      memberName,
      memberEmail: registration.member?.email ?? null,
      memberPhone: registration.member?.phone ?? null,
      memberAvatarUrl: registration.member?.avatar_url ?? null,
      guestName: registration.guest_name,
      guestEmail: registration.guest_email,
      guestPhone: registration.guest_phone,
      displayName: memberName || registration.guest_name || 'Unknown',
      displayEmail: registration.member?.email || registration.guest_email || null,
      displayPhone: registration.member?.phone || registration.guest_phone || null,
      isGuest,
      registrationDate: new Date(registration.registration_date),
      partySize: registration.party_size,
      confirmationCode: registration.confirmation_code,
      status: registration.status,
      statusLabel: STATUS_LABELS[registration.status],
      waitlistPosition: registration.waitlist_position,
      formResponses: registration.form_responses,
      specialRequests: registration.special_requests,
      adminNotes: registration.admin_notes,
    };
  }

  toRegistrationViewList(registrations: ScheduleRegistrationWithMember[]): ScheduleRegistrationView[] {
    return registrations.map(r => this.toRegistrationView(r));
  }

  // ==================== Private Helpers ====================

  private async updateOccurrenceCounts(occurrenceId: string, tenantId: string): Promise<void> {
    const counts = await this.registrationRepository.getRegistrationCount(occurrenceId, tenantId);
    await this.occurrenceRepository.updateCounts(occurrenceId, {
      registered_count: counts.registered,
      waitlist_count: counts.waitlisted,
    });
  }
}
