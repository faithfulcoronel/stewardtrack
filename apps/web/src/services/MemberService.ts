import 'server-only';
import { injectable, inject } from 'inversify';
import {
  format,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  endOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  addMonths,
  subMonths,
  subYears,
  subWeeks,
} from 'date-fns';
import { randomUUID } from 'crypto';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';
import type { IAccountRepository } from '@/repositories/account.repository';
import type { IFinancialTransactionRepository } from '@/repositories/financialTransaction.repository';
import type { Member, FamilyInput } from '@/models/member.model';
import { QueryOptions, FilterCondition } from '@/adapters/base.adapter';
import type { CrudService } from '@/services/CrudService';
import { MemberValidator } from '@/validators/member.validator';
import { validateOrThrow } from '@/utils/validation';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import { NotificationEventType } from '@/models/notification/notificationEvent.model';
import type { FamilyService } from '@/services/FamilyService';
import type { FamilyRole } from '@/models/familyMember.model';
import type { PlanningService } from '@/services/PlanningService';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * MemberService - Core member management business logic
 *
 * This service handles all member-related operations including CRUD operations,
 * financial calculations, family linking, and notifications.
 *
 * ## Required Feature
 * - `members.core` - All operations require this feature to be licensed
 *
 * ## Required Permissions
 * The following RBAC permissions control access to member operations:
 * - `members:view` - Required to read member data (find, findById, findAll)
 * - `members:manage` - Required to create, update, import, and export members
 * - `members:delete` - Required to soft-delete (archive) members
 *
 * Permission checks should be performed at the API route or metadata layer,
 * not within this service. This service assumes the caller has been authorized.
 *
 * @example
 * // API route should check permission using PermissionGate (single source of truth)
 * const permissionGate = new PermissionGate('members:manage', 'all');
 * const accessResult = await permissionGate.check(userId, tenantId);
 * if (!accessResult.allowed) {
 *   return NextResponse.json({ error: accessResult.reason || 'Permission denied' }, { status: 403 });
 * }
 * const member = await memberService.create(data);
 */
@injectable()
export class MemberService implements CrudService<Member> {
  constructor(
    @inject(TYPES.IMemberRepository)
    private repo: IMemberRepository,
    @inject(TYPES.IAccountRepository)
    private accountRepo: IAccountRepository,
    @inject(TYPES.IFinancialTransactionRepository)
    private ftRepo: IFinancialTransactionRepository,
    @inject(TYPES.NotificationBusService)
    private notificationBus: INotificationBusService,
    @inject(TYPES.FamilyService)
    private familyService: FamilyService,
    @inject(TYPES.PlanningService)
    private planningService: PlanningService,
  ) {}

  /**
   * Find members with pagination and filtering
   * @permission members:view
   */
  find(options: QueryOptions = {}) {
    return this.repo.find({
      ...options,
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        ...(options.filters || {}),
      },
    });
  }

  /**
   * Find all members without pagination
   * @permission members:view
   */
  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll({
      ...options,
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        ...(options.filters || {}),
      },
    });
  }

  /**
   * Find a member by ID
   * @permission members:view
   */
  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  /**
   * Check if a member with the same first name, middle name, and last name already exists
   * @param firstName - First name to check
   * @param middleName - Middle name to check (can be null/undefined)
   * @param lastName - Last name to check
   * @param excludeMemberId - Optional member ID to exclude (for updates)
   * @returns The existing member if found, null otherwise
   */
  async findDuplicate(
    firstName: string,
    middleName: string | null | undefined,
    lastName: string,
    excludeMemberId?: string
  ): Promise<Member | null> {
    const filters: Record<string, any> = {
      deleted_at: { operator: 'isEmpty', value: true },
      first_name: { operator: 'ilike', value: firstName.trim() },
      last_name: { operator: 'ilike', value: lastName.trim() },
    };

    // Handle middle name - check for exact match including null/empty
    if (middleName && middleName.trim()) {
      filters.middle_name = { operator: 'ilike', value: middleName.trim() };
    } else {
      // If no middle name provided, look for records with no middle name
      filters.middle_name = { operator: 'isEmpty', value: true };
    }

    const { data } = await this.repo.find({
      filters,
      pagination: { page: 1, pageSize: 1 },
    });

    if (!data || data.length === 0) {
      return null;
    }

    // If excludeMemberId is provided, filter it out
    if (excludeMemberId) {
      const filtered = data.filter(m => m.id !== excludeMemberId);
      return filtered.length > 0 ? filtered[0] : null;
    }

    return data[0];
  }

  /**
   * Create a new member record
   * @permission members:manage
   */
  async create(
    data: Partial<Member>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(MemberValidator, data);

    // Check for duplicate member
    if (data.first_name && data.last_name) {
      const duplicate = await this.findDuplicate(
        data.first_name,
        data.middle_name,
        data.last_name
      );
      if (duplicate) {
        throw new Error(
          `A member with the name "${data.first_name}${data.middle_name ? ' ' + data.middle_name : ''} ${data.last_name}" already exists. Duplicate member records are not allowed.`
        );
      }
    }

    // Extract family input before passing to repository
    const familyInput = data.family;
    const memberData = { ...data };
    delete memberData.family;

    const member = await this.repo.create(memberData, relations, fieldsToRemove);

    // Handle family linking after member is created
    if (familyInput !== undefined) {
      await this.handleFamilyLinking(member.id!, familyInput);
    }

    // Send notification if member has a linked user account
    // IMPORTANT: Use original input data for notification, not encrypted member from DB
    if (member.user_id) {
      await this.sendMemberJoinedNotification(member, data);
    }

    // Auto-sync birthday and anniversary to calendar
    // IMPORTANT: Use original input data for calendar events (plain text names)
    await this.syncMemberCalendarEvents(member, data);

    return member;
  }

  /**
   * Update an existing member record
   * @permission members:manage
   */
  async update(
    id: string,
    data: Partial<Member>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(MemberValidator, data);

    // Check for duplicate member if name fields are being updated
    if (data.first_name || data.last_name || data.middle_name !== undefined) {
      // Get current member to fill in any missing name fields
      const currentMember = await this.repo.findById(id);
      if (currentMember) {
        const firstName = data.first_name ?? currentMember.first_name;
        const middleName = data.middle_name !== undefined ? data.middle_name : currentMember.middle_name;
        const lastName = data.last_name ?? currentMember.last_name;

        if (firstName && lastName) {
          const duplicate = await this.findDuplicate(firstName, middleName, lastName, id);
          if (duplicate) {
            throw new Error(
              `A member with the name "${firstName}${middleName ? ' ' + middleName : ''} ${lastName}" already exists. Duplicate member records are not allowed.`
            );
          }
        }
      }
    }

    // Extract family input before passing to repository
    const familyInput = data.family;
    const memberData = { ...data };
    delete memberData.family;

    const member = await this.repo.update(id, memberData, relations, fieldsToRemove);

    // Handle family linking after member is updated
    if (familyInput !== undefined) {
      await this.handleFamilyLinking(id, familyInput);
    }

    // Auto-sync birthday and anniversary to calendar if they were updated
    // IMPORTANT: Use original input data for calendar events (plain text names)
    if (data.birthday !== undefined || data.anniversary !== undefined) {
      await this.syncMemberCalendarEvents(member, data);
    }

    return member;
  }

  /**
   * Handle family linking for a member
   * Creates or updates family association based on FamilyInput
   */
  private async handleFamilyLinking(memberId: string, familyInput: FamilyInput | null | undefined): Promise<void> {
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      console.warn('[MemberService] No tenant context for family linking');
      return;
    }

    // If familyInput is null, remove all family associations
    if (familyInput === null) {
      const existingFamilies = await this.familyService.getMemberFamilies(memberId, tenantId);
      for (const family of existingFamilies) {
        await this.familyService.removeMemberFromFamily(family.family_id, memberId, tenantId);
      }
      return;
    }

    // If no family input, nothing to do
    if (!familyInput) {
      return;
    }

    let familyId = familyInput.id;
    const role: FamilyRole = familyInput.role ?? 'other';
    const isPrimary = familyInput.isPrimary ?? true;

    // Create or update the family
    if (familyId) {
      // Update existing family with new data if provided
      const updateData: Record<string, unknown> = {};
      if (familyInput.name !== undefined) updateData.name = familyInput.name;
      if (familyInput.address_street !== undefined) updateData.address_street = familyInput.address_street;
      if (familyInput.address_city !== undefined) updateData.address_city = familyInput.address_city;
      if (familyInput.address_state !== undefined) updateData.address_state = familyInput.address_state;
      if (familyInput.address_postal_code !== undefined) updateData.address_postal_code = familyInput.address_postal_code;

      if (Object.keys(updateData).length > 0) {
        await this.familyService.updateFamily(familyId, updateData);
      }
    } else if (familyInput.name) {
      // Create new family if name is provided but no ID
      const newFamily = await this.familyService.createFamily({
        tenant_id: tenantId,
        name: familyInput.name,
        address_street: familyInput.address_street,
        address_city: familyInput.address_city,
        address_state: familyInput.address_state,
        address_postal_code: familyInput.address_postal_code,
      });
      familyId = newFamily.id;
    } else {
      // No family ID and no name - check if member has existing primary family
      const existingPrimary = await this.familyService.getPrimaryFamily(memberId, tenantId);
      if (existingPrimary) {
        familyId = existingPrimary.family_id;
        // Update address on existing family if provided
        const updateData: Record<string, unknown> = {};
        if (familyInput.address_street !== undefined) updateData.address_street = familyInput.address_street;
        if (familyInput.address_city !== undefined) updateData.address_city = familyInput.address_city;
        if (familyInput.address_state !== undefined) updateData.address_state = familyInput.address_state;
        if (familyInput.address_postal_code !== undefined) updateData.address_postal_code = familyInput.address_postal_code;

        if (Object.keys(updateData).length > 0) {
          await this.familyService.updateFamily(familyId, updateData);
        }
      } else {
        // No existing family and no name provided - nothing to do
        return;
      }
    }

    if (!familyId) {
      return;
    }

    // Check if member is already in this family
    const isMember = await this.familyService.isMemberInFamily(familyId, memberId, tenantId);

    if (isMember) {
      // Update role if member is already in family
      await this.familyService.updateMemberRole(familyId, memberId, tenantId, role);
      if (isPrimary) {
        await this.familyService.setPrimaryFamily(memberId, familyId, tenantId);
      }
    } else {
      // Add member to family
      await this.familyService.addMemberToFamily(familyId, memberId, tenantId, {
        role,
        isPrimary,
      });
    }
  }

  /**
   * Soft-delete (archive) a member record
   * @permission members:delete
   */
  delete(id: string) {
    return this.repo.delete(id);
  }

  getCurrentMonthBirthdays() {
    return this.repo
      .getCurrentMonthBirthdays()
      .then(members => members.filter(m => !m.deleted_at));
  }

  getBirthdaysByMonth(month: number) {
    return this.repo
      .getBirthdaysByMonth(month)
      .then(members => members.filter(m => !m.deleted_at));
  }

  getCurrentUserMember() {
    return this.repo.getCurrentUserMember();
  }

  private async getMemberAccountIds(memberId: string): Promise<string[]> {
    const { data } = await this.accountRepo.findAll({
      select: 'id',
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        member_id: { operator: 'eq', value: memberId },
      },
    });
    return (data || []).map(account => account.id);
  }

  private buildAccountFilter(accountIds: string[]): FilterCondition | null {
    if (!accountIds.length) return null;
    if (accountIds.length === 1) {
      return { operator: 'eq', value: accountIds[0] };
    }
    return { operator: 'isAnyOf', value: accountIds };
  }

  async getFinancialTotals(memberId: string) {
    const accountIds = await this.getMemberAccountIds(memberId);
    if (!accountIds.length)
      return {
        year: 0,
        month: 0,
        week: 0,
        yearChange: 0,
        monthChange: 0,
        weekChange: 0,
      };

    const accountFilter = this.buildAccountFilter(accountIds);
    if (!accountFilter)
      return {
        year: 0,
        month: 0,
        week: 0,
        yearChange: 0,
        monthChange: 0,
        weekChange: 0,
      };

    const memberAccountFilter: FilterCondition = {
      operator: 'eq',
      value: memberId,
    };

    const today = new Date();
    const fetchRange = (start: Date, end: Date) =>
      this.ftRepo
        .findAll({
          select: 'credit',
          filters: {
            deleted_at: { operator: 'isEmpty', value: true },
            account_id: accountFilter,
            'accounts.member_id': memberAccountFilter,
            'chart_of_accounts.account_type': { operator: 'eq', value: 'revenue' },
            type: { operator: 'eq', value: 'income' },
            credit: { operator: 'gt', value: 0 },
            date: {
              operator: 'between',
              value: format(start, 'yyyy-MM-dd'),
              valueTo: format(end, 'yyyy-MM-dd'),
            },
          },
        })
        .then(r => r.data || []);

    const [
      yearRes,
      monthRes,
      weekRes,
      lastYearRes,
      lastMonthRes,
      lastWeekRes,
    ] = await Promise.all([
      fetchRange(startOfYear(today), endOfYear(today)),
      fetchRange(startOfMonth(today), endOfMonth(today)),
      fetchRange(startOfWeek(today), endOfWeek(today)),
      fetchRange(
        startOfYear(subYears(today, 1)),
        endOfYear(subYears(today, 1)),
      ),
      fetchRange(
        startOfMonth(subMonths(today, 1)),
        endOfMonth(subMonths(today, 1)),
      ),
      fetchRange(
        startOfWeek(subWeeks(today, 1)),
        endOfWeek(subWeeks(today, 1)),
      ),
    ]);

    const sum = (rows: any[]) =>
      rows.reduce((s, r) => s + Number(r.credit || 0), 0);

    const yearTotal = sum(yearRes);
    const lastYearTotal = sum(lastYearRes);
    const monthTotal = sum(monthRes);
    const lastMonthTotal = sum(lastMonthRes);
    const weekTotal = sum(weekRes);
    const lastWeekTotal = sum(lastWeekRes);

    const change = (cur: number, prev: number) =>
      prev > 0 ? ((cur - prev) / prev) * 100 : 0;

    return {
      year: yearTotal,
      month: monthTotal,
      week: weekTotal,
      yearChange: change(yearTotal, lastYearTotal),
      monthChange: change(monthTotal, lastMonthTotal),
      weekChange: change(weekTotal, lastWeekTotal),
    };
  }

  async getFinancialTrends(
    memberId: string,
    range: 'current' | 'thisYear' | 'lastYear' = 'current',
  ) {
    const accountIds = await this.getMemberAccountIds(memberId);
    if (!accountIds.length)
      return [] as { month: string; contributions: number }[];

    const accountFilter = this.buildAccountFilter(accountIds);
    if (!accountFilter)
      return [] as { month: string; contributions: number }[];

    const memberAccountFilter: FilterCondition = {
      operator: 'eq',
      value: memberId,
    };

    const today = new Date();
    let months: { start: Date; end: Date; label: string }[] = [];

    if (range === 'thisYear') {
      const start = startOfYear(today);
      const count = today.getMonth() + 1;
      months = Array.from({ length: count }, (_, i) => {
        const d = addMonths(start, i);
        return {
          start: startOfMonth(d),
          end: endOfMonth(d),
          label: format(d, 'MMM yyyy'),
        };
      });
    } else if (range === 'lastYear') {
      const start = startOfYear(subYears(today, 1));
      months = Array.from({ length: 12 }, (_, i) => {
        const d = addMonths(start, i);
        return {
          start: startOfMonth(d),
          end: endOfMonth(d),
          label: format(d, 'MMM yyyy'),
        };
      });
    } else {
      months = Array.from({ length: 12 }, (_, i) => {
        const d = subMonths(today, i);
        return {
          start: startOfMonth(d),
          end: endOfMonth(d),
          label: format(d, 'MMM yyyy'),
        };
      }).reverse();
    }

    const data = await Promise.all(
      months.map(({ start, end, label }) =>
        this.ftRepo
          .findAll({
            select: 'credit',
            filters: {
              deleted_at: { operator: 'isEmpty', value: true },
              account_id: accountFilter,
              'accounts.member_id': memberAccountFilter,
              'chart_of_accounts.account_type': { operator: 'eq', value: 'revenue' },
              type: { operator: 'eq', value: 'income' },
              credit: { operator: 'gt', value: 0 },
              date: {
                operator: 'between',
                value: format(start, 'yyyy-MM-dd'),
                valueTo: format(end, 'yyyy-MM-dd'),
              },
            },
          })
          .then(res => {
            const total = (res.data || []).reduce(
              (s, r) => s + Number(r.credit || 0),
              0,
            );
            return { month: label, contributions: total };
          }),
      ),
    );

    return data;
  }

  async getRecentTransactions(memberId: string, limit = 10) {
    const accountIds = await this.getMemberAccountIds(memberId);
    if (!accountIds.length) return [];

    const accountFilter = this.buildAccountFilter(accountIds);
    if (!accountFilter) return [];

    const memberAccountFilter: FilterCondition = {
      operator: 'eq',
      value: memberId,
    };
    const { data } = await this.ftRepo.find({
      select:
        'id, date, description, credit, header_id, category:category_id(name), fund:fund_id(name, code)',
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        account_id: accountFilter,
        'accounts.member_id': memberAccountFilter,
        'chart_of_accounts.account_type': { operator: 'eq', value: 'revenue' },
        type: { operator: 'eq', value: 'income' },
        credit: { operator: 'gt', value: 0 },
      },
      order: { column: 'date', ascending: false },
      pagination: { page: 1, pageSize: limit },
    });

    return data || [];
  }

  async getTransactionsInRange(memberId: string, from: Date, to: Date) {
    const accountIds = await this.getMemberAccountIds(memberId);
    if (!accountIds.length) return [];

    const accountFilter = this.buildAccountFilter(accountIds);
    if (!accountFilter) return [];

    const memberAccountFilter: FilterCondition = {
      operator: 'eq',
      value: memberId,
    };

    const { data } = await this.ftRepo.find({
      select:
        'id, date, description, credit, header_id, category:category_id(name), fund:fund_id(name, code)',
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        account_id: accountFilter,
        'accounts.member_id': memberAccountFilter,
        'chart_of_accounts.account_type': { operator: 'eq', value: 'revenue' },
        type: { operator: 'eq', value: 'income' },
        credit: { operator: 'gt', value: 0 },
        date: {
          operator: 'between',
          value: format(startOfDay(from), 'yyyy-MM-dd'),
          valueTo: format(endOfDay(to), 'yyyy-MM-dd'),
        },
      },
      order: { column: 'date', ascending: false },
    });

    return data || [];
  }

  /**
   * Send notification when a new member joins (has linked user account)
   * @param member - The created member object (has encrypted fields from DB)
   * @param originalData - Original input data with plain text names (not encrypted)
   */
  private async sendMemberJoinedNotification(
    member: Member,
    originalData: Partial<Member>
  ): Promise<void> {
    try {
      if (!member.user_id || !member.tenant_id) {
        return;
      }

      // Use original input data for display (plain text, not encrypted)
      const firstName = originalData.first_name || 'Member';
      const lastName = originalData.last_name || '';
      const displayName = [firstName, lastName].filter(Boolean).join(' ');

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.MEMBER_JOINED,
        category: 'member',
        priority: 'normal',
        tenantId: member.tenant_id,
        recipient: {
          userId: member.user_id,
          email: originalData.email || undefined,
          phone: originalData.contact_number || undefined,
        },
        payload: {
          title: 'Welcome to the Community',
          message: `Welcome ${firstName}! Your member profile has been created. Explore your dashboard to see your giving history, events, and more.`,
          memberName: displayName,
          memberId: member.id,
          actionType: 'redirect',
          actionPayload: '/admin/my-profile',
        },
        channels: ['in_app', 'email'],
      });
    } catch (error) {
      // Log error but don't fail the member creation
      console.error('Failed to send member joined notification:', error);
    }
  }

  /**
   * Sync member's birthday and anniversary to the calendar
   * @param member - The member object from DB (has encrypted fields)
   * @param originalData - Original input data with plain text names (not encrypted)
   */
  private async syncMemberCalendarEvents(
    member: Member,
    originalData: Partial<Member>
  ): Promise<void> {
    try {
      // Use original input data for names (plain text, not encrypted)
      const firstName = originalData.first_name || member.first_name || '';
      const lastName = originalData.last_name || member.last_name || '';

      // Get birthday from original data if provided, otherwise from member
      const birthday = originalData.birthday ?? member.birthday;
      const anniversary = originalData.anniversary ?? member.anniversary;

      // Sync birthday
      if (birthday) {
        await this.planningService.syncMemberBirthdayEvent({
          id: member.id!,
          first_name: firstName,
          last_name: lastName,
          birthday: birthday,
        });
      } else {
        // Remove birthday event if date was cleared
        await this.planningService.removeMemberBirthdayEvent(member.id!);
      }

      // Sync anniversary
      if (anniversary) {
        await this.planningService.syncMemberAnniversaryEvent({
          id: member.id!,
          first_name: firstName,
          last_name: lastName,
          anniversary: anniversary,
        });
      } else {
        // Remove anniversary event if date was cleared
        await this.planningService.removeMemberAnniversaryEvent(member.id!);
      }
    } catch (error) {
      console.error('Failed to sync member calendar events:', error);
    }
  }
}
