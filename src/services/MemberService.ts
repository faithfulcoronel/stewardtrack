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
import type { Member } from '@/models/member.model';
import { QueryOptions, FilterCondition } from '@/adapters/base.adapter';
import type { CrudService } from '@/services/CrudService';
import { MemberValidator } from '@/validators/member.validator';
import { validateOrThrow } from '@/utils/validation';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import { NotificationEventType } from '@/models/notification/notificationEvent.model';

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
  ) {}

  find(options: QueryOptions = {}) {
    return this.repo.find({
      ...options,
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        ...(options.filters || {}),
      },
    });
  }

  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll({
      ...options,
      filters: {
        deleted_at: { operator: 'isEmpty', value: true },
        ...(options.filters || {}),
      },
    });
  }

  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  async create(
    data: Partial<Member>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(MemberValidator, data);
    const member = await this.repo.create(data, relations, fieldsToRemove);

    // Send notification if member has a linked user account
    if (member.user_id) {
      await this.sendMemberJoinedNotification(member);
    }

    return member;
  }

  update(
    id: string,
    data: Partial<Member>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    validateOrThrow(MemberValidator, data);
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

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
   */
  private async sendMemberJoinedNotification(member: Member): Promise<void> {
    try {
      if (!member.user_id || !member.tenant_id) {
        return;
      }

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.MEMBER_JOINED,
        category: 'member',
        priority: 'normal',
        tenantId: member.tenant_id,
        recipient: {
          userId: member.user_id,
          email: member.email || undefined,
          phone: member.contact_number || undefined,
        },
        payload: {
          title: 'Welcome to the Community',
          message: `Welcome ${member.first_name}! Your member profile has been created. Explore your dashboard to see your giving history, events, and more.`,
          memberName: `${member.first_name} ${member.last_name}`,
          memberId: member.id,
          actionType: 'redirect',
          actionPayload: '/member/dashboard',
        },
        channels: ['in_app', 'email'],
      });
    } catch (error) {
      // Log error but don't fail the member creation
      console.error('Failed to send member joined notification:', error);
    }
  }
}
