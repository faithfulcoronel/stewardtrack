import { injectable, inject } from 'inversify';

import type { IMemberAdapter } from '@/adapters/member.adapter';
import { BaseRepository } from '@/repositories/base.repository';
import { Member } from '@/models/member.model';
import { MemberValidator } from '@/validators/member.validator';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { QueryOptions } from '@/lib/repository/query';

/**
 * MemberRepository Interface
 *
 * Data access contract for member records in the membership module.
 *
 * ## Permission Requirements (Feature: members.core)
 *
 * | Operation | Required Permission |
 * |-----------|---------------------|
 * | Read operations (find, findById, findAll, search) | `members:view` |
 * | Create operations | `members:manage` |
 * | Update operations | `members:manage` |
 * | Delete operations (soft-delete/archive) | `members:delete` |
 *
 * Permission checks are enforced at the service/API route level.
 */
export interface IMemberRepository extends BaseRepository<Member> {
  /** @permission members:view */
  getCurrentMonthBirthdays(): Promise<Member[]>;
  /** @permission members:view */
  getBirthdaysByMonth(month: number): Promise<Member[]>;
  /** @permission members:view */
  getCurrentUserMember(): Promise<Member | null>;
  /** @permission members:view */
  findByAccount(accountId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }>;
  /** @permission members:view */
  findByScheduleRegistration(scheduleId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }>;
  /** @permission members:view */
  findByMinistry(ministryId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }>;
  /** @permission members:view */
  search(searchTerm: string, limit?: number): Promise<{ data: Member[]; count: number | null }>;
}

@injectable()
export class MemberRepository
  extends BaseRepository<Member>
  implements IMemberRepository
{
  constructor(@inject(TYPES.IMemberAdapter) private readonly memberAdapter: IMemberAdapter) {
    super(memberAdapter);
  }

  async getCurrentMonthBirthdays(): Promise<Member[]> {
    return await this.memberAdapter.getCurrentMonthBirthdays();
  }

  async getBirthdaysByMonth(month: number): Promise<Member[]> {
    return await this.memberAdapter.getBirthdaysByMonth(month);
  }

  async getCurrentUserMember(): Promise<Member | null> {
    return await this.memberAdapter.getCurrentUserMember();
  }

  async findByAccount(accountId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }> {
    return await this.memberAdapter.fetchByAccount(accountId, options);
  }

  async findByScheduleRegistration(scheduleId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }> {
    return await this.memberAdapter.fetchByScheduleRegistration(scheduleId, options);
  }

  async findByMinistry(ministryId: string, options?: Omit<QueryOptions, 'filters'>): Promise<{ data: Member[]; count: number | null }> {
    return await this.memberAdapter.fetchByMinistry(ministryId, options);
  }

  async search(searchTerm: string, limit?: number): Promise<{ data: Member[]; count: number | null }> {
    return await this.memberAdapter.searchMembers(searchTerm, limit);
  }

  protected override async beforeCreate(data: Partial<Member>): Promise<Partial<Member>> {
    MemberValidator.validate(data);
    return this.formatMemberData(data);
  }

  protected override async afterCreate(data: Member): Promise<void> {
    NotificationService.showSuccess(`Member "${data.first_name} ${data.last_name}" created successfully`);
  }

  protected override async beforeUpdate(id: string, data: Partial<Member>): Promise<Partial<Member>> {
    MemberValidator.validate(data);
    return this.formatMemberData(data);
  }

  private formatMemberData(data: Partial<Member>): Partial<Member> {
    const formattedData = { ...data };
    
    if (formattedData.first_name) {
      formattedData.first_name = formattedData.first_name.trim();
    }
    
    if (formattedData.last_name) {
      formattedData.last_name = formattedData.last_name.trim();
    }
    
    if (formattedData.email) {
      formattedData.email = formattedData.email.toLowerCase().trim();
    }
    
    return formattedData;
  }
}