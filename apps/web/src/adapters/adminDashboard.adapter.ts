import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { startOfMonth, startOfWeek, endOfWeek, format, differenceInDays, parseISO } from 'date-fns';
import { tenantUtils } from '@/utils/tenantUtils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { TYPES } from '@/lib/types';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';
import type {
  WelcomeData,
  BibleVerse,
  MemberMetricsSummary,
  FinanceMetricsSummary,
  EventMetricsSummary,
  EngagementMetricsSummary,
  DashboardHighlight,
  RecentActivity,
  UpcomingEvent,
  UpcomingBirthday,
  QuickLink,
} from '@/models/dashboard/adminDashboard.model';

// ==================== ADAPTER INTERFACE ====================
export interface IAdminDashboardAdapter {
  fetchWelcomeData(userId: string, userEmail: string): Promise<WelcomeData>;
  fetchBibleVerse(): Promise<BibleVerse>;
  fetchMemberMetrics(): Promise<MemberMetricsSummary>;
  fetchFinanceMetrics(): Promise<FinanceMetricsSummary>;
  fetchEventMetrics(): Promise<EventMetricsSummary>;
  fetchEngagementMetrics(): Promise<EngagementMetricsSummary>;
  fetchHighlights(limit: number): Promise<DashboardHighlight[]>;
  fetchRecentActivity(limit: number): Promise<RecentActivity[]>;
  fetchUpcomingEvents(limit: number): Promise<UpcomingEvent[]>;
  fetchUpcomingBirthdays(limit: number): Promise<UpcomingBirthday[]>;
  fetchQuickLinks(): Promise<QuickLink[]>;
}


// ==================== ADAPTER IMPLEMENTATION ====================
@injectable()
export class AdminDashboardAdapter implements IAdminDashboardAdapter {
  private supabase: SupabaseClient | null = null;

  constructor(
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {}

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient();
    }
    return this.supabase;
  }

  private async getTenantId(): Promise<string | null> {
    return (await tenantUtils.getTenantId()) || null;
  }

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  private getPIIFields() {
    return getFieldEncryptionConfig('members');
  }

  private async decryptMember<T extends Record<string, unknown>>(
    member: T,
    tenantId: string
  ): Promise<T> {
    try {
      const encrypted_fields = (member as Record<string, unknown>).encrypted_fields as string[] | undefined;
      const firstName = (member as Record<string, unknown>).first_name as string | undefined;
      const looksEncrypted = firstName && typeof firstName === 'string' &&
        firstName.match(/^\d+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);

      if (!looksEncrypted && (!encrypted_fields || encrypted_fields.length === 0)) {
        return member;
      }

      return await this.encryptionService.decryptFields(
        member,
        tenantId,
        this.getPIIFields()
      );
    } catch (error) {
      console.error('[AdminDashboardAdapter] Decryption failed:', error);
      return member;
    }
  }

  async fetchWelcomeData(userId: string, userEmail: string): Promise<WelcomeData> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    let tenantName = 'Your Church';
    let tenantLogoUrl: string | null = null;
    let churchImageUrl: string | null = null;

    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, logo_url, church_image_url')
        .eq('id', tenantId)
        .single();

      if (tenant) {
        tenantName = tenant.name;
        tenantLogoUrl = tenant.logo_url;
        churchImageUrl = tenant.church_image_url;
      }
    }

    // Get user's display name and profile picture - check linked member first, then profile
    let userName = userEmail.split('@')[0];
    let userProfilePictureUrl: string | null = null;

    // Check if user is linked to a member record
    if (tenantId) {
      const { data: linkedMember } = await supabase
        .from('members')
        .select('id, first_name, last_name, profile_picture_url, encrypted_fields')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (linkedMember) {
        // Decrypt member data if needed
        const decryptedMember = await this.decryptMember(linkedMember, tenantId);
        const firstName = decryptedMember.first_name as string;
        const lastName = decryptedMember.last_name as string;
        if (firstName && lastName) {
          userName = `${firstName} ${lastName}`;
        } else if (firstName) {
          userName = firstName;
        }
        // Get profile picture from linked member record
        userProfilePictureUrl = (decryptedMember.profile_picture_url as string) || null;
      }
    }

    // Fall back to profile if no linked member found
    if (userName === userEmail.split('@')[0]) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', userId)
        .single();

      if (profile) {
        userName = profile.display_name || profile.full_name || userName;
      }
    }

    return {
      userName,
      userEmail,
      userProfilePictureUrl,
      tenantId,
      tenantName,
      tenantLogoUrl,
      churchImageUrl,
      lastSignIn: null, // Will be filled from auth user data
      currentTime: new Date().toISOString(),
      greeting: this.getGreeting(),
    };
  }

  async fetchBibleVerse(): Promise<BibleVerse> {
    try {
      // Use bible-api.com random verse endpoint - free, no API key required
      // Uses World English Bible (WEB) translation which is public domain
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        'https://bible-api.com/?random=verse&translation=web',
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bible API returned ${response.status}`);
      }

      const data = await response.json() as {
        reference?: string;
        text?: string;
        verses?: Array<{ text: string }>;
        translation_name?: string;
      };

      // Format the verse text (combine multiple verses if range)
      let verseText = '';
      if (data.verses && Array.isArray(data.verses)) {
        verseText = data.verses
          .map((v: { text: string }) => v.text.trim())
          .join(' ');
      } else if (data.text) {
        verseText = data.text.trim();
      }

      // Clean up the text (remove extra whitespace, newlines)
      verseText = verseText.replace(/\s+/g, ' ').trim();

      return {
        reference: data.reference || 'Unknown',
        text: verseText || 'Unable to load verse',
        version: data.translation_name || 'WEB',
      };
    } catch (error) {
      console.error('[AdminDashboardAdapter] Error fetching Bible verse from API:', error);

      // Return an empty verse if API fails - UI will handle the empty state
      return {
        reference: '',
        text: '',
        version: '',
      };
    }
  }

  async fetchMemberMetrics(): Promise<MemberMetricsSummary> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    const today = new Date();
    const monthStart = startOfMonth(today);
    const lastMonthStart = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Total members
    let totalQuery = supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);
    if (tenantId) totalQuery = totalQuery.eq('tenant_id', tenantId);
    const { count: totalCount } = await totalQuery;

    // New members this month
    let newQuery = supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', format(monthStart, 'yyyy-MM-dd'));
    if (tenantId) newQuery = newQuery.eq('tenant_id', tenantId);
    const { count: newThisMonthCount } = await newQuery;

    // New members last month (for trend calculation)
    let lastMonthQuery = supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', format(lastMonthStart, 'yyyy-MM-dd'))
      .lte('created_at', format(lastMonthEnd, 'yyyy-MM-dd'));
    if (tenantId) lastMonthQuery = lastMonthQuery.eq('tenant_id', tenantId);
    const { count: lastMonthCount } = await lastMonthQuery;

    // Active members (those with status not 'inactive')
    let activeQuery = supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .neq('status', 'inactive');
    if (tenantId) activeQuery = activeQuery.eq('tenant_id', tenantId);
    const { count: activeCount } = await activeQuery;

    // Calculate trend
    const newThisMonth = newThisMonthCount || 0;
    const lastMonth = lastMonthCount || 0;
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (lastMonth > 0) {
      trendPercentage = Math.round(((newThisMonth - lastMonth) / lastMonth) * 100);
      trend = trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'stable';
    } else if (newThisMonth > 0) {
      trend = 'up';
      trendPercentage = 100;
    }

    return {
      total: totalCount || 0,
      newThisMonth,
      activeCount: activeCount || 0,
      trend,
      trendPercentage: Math.abs(trendPercentage),
    };
  }

  async fetchFinanceMetrics(): Promise<FinanceMetricsSummary> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    const today = new Date();
    const monthStart = startOfMonth(today);

    // Get donations this month from income_expense_transactions
    let transactionsQuery = supabase
      .from('income_expense_transactions')
      .select('amount')
      .eq('type', 'income')
      .gte('transaction_date', format(monthStart, 'yyyy-MM-dd'));
    if (tenantId) transactionsQuery = transactionsQuery.eq('tenant_id', tenantId);
    const { data: transactions } = await transactionsQuery;

    const donationAmounts = (transactions || []).map(t => Number(t.amount) || 0);
    const totalDonations = donationAmounts.reduce((sum, amount) => sum + amount, 0);
    const donationCount = donationAmounts.length;
    const averageDonation = donationCount > 0 ? totalDonations / donationCount : 0;

    // Get tenant currency
    let currency = 'PHP';
    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('currency')
        .eq('id', tenantId)
        .single();
      if (tenant?.currency) {
        currency = tenant.currency;
      }
    }

    return {
      totalDonationsThisMonth: totalDonations,
      donationCount,
      averageDonation: Math.round(averageDonation * 100) / 100,
      trend: 'stable',
      trendPercentage: 0,
      currency,
    };
  }

  async fetchEventMetrics(): Promise<EventMetricsSummary> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    // Upcoming events
    let upcomingQuery = supabase
      .from('calendar_events')
      .select('id', { count: 'exact', head: true })
      .gte('start_date', format(today, 'yyyy-MM-dd'));
    if (tenantId) upcomingQuery = upcomingQuery.eq('tenant_id', tenantId);
    const { count: upcomingCount } = await upcomingQuery;

    // Events this week
    let thisWeekQuery = supabase
      .from('calendar_events')
      .select('id', { count: 'exact', head: true })
      .gte('start_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('start_date', format(weekEnd, 'yyyy-MM-dd'));
    if (tenantId) thisWeekQuery = thisWeekQuery.eq('tenant_id', tenantId);
    const { count: thisWeekCount } = await thisWeekQuery;

    return {
      upcomingCount: upcomingCount || 0,
      thisWeekCount: thisWeekCount || 0,
      attendanceRate: 0, // Would require attendance tracking feature
    };
  }

  async fetchEngagementMetrics(): Promise<EngagementMetricsSummary> {
    // These metrics would require additional features to be implemented
    // Returning placeholder data for now
    return {
      activeVolunteers: 0,
      smallGroupsCount: 0,
      checkInsToday: 0,
    };
  }

  async fetchHighlights(limit: number): Promise<DashboardHighlight[]> {
    const highlights: DashboardHighlight[] = [];
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    // Check if onboarding is incomplete - this should be shown first
    if (tenantId) {
      try {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('onboarding_completed')
          .eq('id', tenantId)
          .single();

        if (tenant && !tenant.onboarding_completed) {
          highlights.push({
            id: 'complete-setup',
            type: 'setup',
            priority: 'urgent',
            title: 'Complete Your Church Setup',
            description: 'Finish setting up your church to unlock all features',
            actionLabel: 'Continue Setup',
            actionHref: '/admin/onboarding',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('[AdminDashboardAdapter] Error checking onboarding status:', error);
      }
    }

    // Get upcoming birthdays this week as highlights
    const today = new Date();
    const weekEnd = endOfWeek(today);

    try {
      const { data: birthdays } = await supabase.rpc('get_current_month_birthdays');

      if (birthdays && tenantId) {
        const decryptedBirthdays = await Promise.all(
          birthdays.slice(0, 5).map((member: Record<string, unknown>) =>
            this.decryptMember(member, tenantId)
          )
        );

        for (const member of decryptedBirthdays) {
          const birthday = member.birthday as string;
          if (!birthday) continue;

          const birthdayDate = parseISO(birthday);
          const thisYearBirthday = new Date(
            today.getFullYear(),
            birthdayDate.getMonth(),
            birthdayDate.getDate()
          );

          if (thisYearBirthday >= today && thisYearBirthday <= weekEnd) {
            const daysUntil = differenceInDays(thisYearBirthday, today);
            highlights.push({
              id: `birthday-${member.id}`,
              type: 'birthday',
              priority: daysUntil === 0 ? 'high' : 'medium',
              title: daysUntil === 0
                ? `${member.first_name} ${member.last_name}'s Birthday Today!`
                : `${member.first_name} ${member.last_name}'s Birthday`,
              description: daysUntil === 0
                ? 'Send birthday wishes!'
                : `Birthday in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
              actionLabel: 'View Profile',
              actionHref: `/admin/members/${member.id}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      console.error('[AdminDashboardAdapter] Error fetching birthday highlights:', error);
    }

    // Get follow-up items from care plans
    try {
      let carePlansQuery = supabase
        .from('member_care_plans')
        .select('id, member_id, title, next_follow_up_date, status')
        .eq('status', 'active')
        .lte('next_follow_up_date', format(weekEnd, 'yyyy-MM-dd'))
        .gte('next_follow_up_date', format(today, 'yyyy-MM-dd'))
        .limit(5);
      if (tenantId) carePlansQuery = carePlansQuery.eq('tenant_id', tenantId);
      const { data: carePlans } = await carePlansQuery;

      for (const plan of carePlans || []) {
        const followUpDate = parseISO(plan.next_follow_up_date);
        const daysUntil = differenceInDays(followUpDate, today);
        highlights.push({
          id: `followup-${plan.id}`,
          type: 'follow-up',
          priority: daysUntil <= 1 ? 'high' : 'medium',
          title: plan.title || 'Follow-up Required',
          description: daysUntil === 0
            ? 'Follow-up due today'
            : `Follow-up due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
          actionLabel: 'View Care Plan',
          actionHref: `/admin/members/${plan.member_id}/care`,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[AdminDashboardAdapter] Error fetching care plan highlights:', error);
    }

    // Sort by priority and limit
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return highlights
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, limit);
  }

  async fetchRecentActivity(limit: number): Promise<RecentActivity[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    const activities: RecentActivity[] = [];

    // Get recent member additions
    try {
      let recentMembersQuery = supabase
        .from('members')
        .select('id, tenant_id, first_name, last_name, encrypted_fields, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (tenantId) recentMembersQuery = recentMembersQuery.eq('tenant_id', tenantId);
      const { data: recentMembers } = await recentMembersQuery;

      if (recentMembers && tenantId) {
        const decrypted = await Promise.all(
          recentMembers.map((m: Record<string, unknown>) => this.decryptMember(m, tenantId))
        );

        for (const member of decrypted) {
          activities.push({
            id: `member-${member.id}`,
            type: 'member_added',
            title: 'New Member Added',
            description: `${member.first_name} ${member.last_name} was added`,
            timestamp: member.created_at as string,
            entityType: 'member',
            entityId: member.id as string,
          });
        }
      }
    } catch (error) {
      console.error('[AdminDashboardAdapter] Error fetching recent members:', error);
    }

    // Get recent donations
    try {
      let recentDonationsQuery = supabase
        .from('income_expense_transactions')
        .select('id, amount, transaction_date, description')
        .eq('type', 'income')
        .order('transaction_date', { ascending: false })
        .limit(5);
      if (tenantId) recentDonationsQuery = recentDonationsQuery.eq('tenant_id', tenantId);
      const { data: recentDonations } = await recentDonationsQuery;

      for (const donation of recentDonations || []) {
        activities.push({
          id: `donation-${donation.id}`,
          type: 'donation_received',
          title: 'Donation Received',
          description: donation.description || `Donation of $${donation.amount}`,
          timestamp: donation.transaction_date,
          entityType: 'transaction',
          entityId: donation.id,
        });
      }
    } catch (error) {
      console.error('[AdminDashboardAdapter] Error fetching recent donations:', error);
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async fetchUpcomingEvents(limit: number): Promise<UpcomingEvent[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    const today = new Date();

    try {
      let eventsQuery = supabase
        .from('calendar_events')
        .select('id, title, description, start_date, end_date, location')
        .gte('start_date', format(today, 'yyyy-MM-dd'))
        .order('start_date', { ascending: true })
        .limit(limit);
      if (tenantId) eventsQuery = eventsQuery.eq('tenant_id', tenantId);
      const { data: events } = await eventsQuery;

      return (events || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: event.start_date,
        endDate: event.end_date,
        location: event.location,
      }));
    } catch (error) {
      console.error('[AdminDashboardAdapter] Error fetching upcoming events:', error);
      return [];
    }
  }

  async fetchUpcomingBirthdays(limit: number): Promise<UpcomingBirthday[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();
    const today = new Date();

    try {
      const { data: birthdays } = await supabase.rpc('get_current_month_birthdays');

      if (!birthdays || !tenantId) return [];

      const decryptedBirthdays = await Promise.all(
        birthdays.map((member: Record<string, unknown>) =>
          this.decryptMember(member, tenantId)
        )
      );

      const upcoming: UpcomingBirthday[] = [];

      for (const member of decryptedBirthdays) {
        const birthday = member.birthday as string;
        if (!birthday) continue;

        const birthdayDate = parseISO(birthday);
        const thisYearBirthday = new Date(
          today.getFullYear(),
          birthdayDate.getMonth(),
          birthdayDate.getDate()
        );

        // If birthday has passed this year, check next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }

        const daysUntil = differenceInDays(thisYearBirthday, today);

        // Calculate age they will be turning
        const birthYear = birthdayDate.getFullYear();
        const celebrationYear = thisYearBirthday.getFullYear();
        const age = celebrationYear - birthYear;

        upcoming.push({
          memberId: member.id as string,
          firstName: member.first_name as string,
          lastName: member.last_name as string,
          birthday,
          daysUntil,
          age: age > 0 ? age : undefined, // Only include if valid age
          profilePictureUrl: member.profile_picture_url as string | null,
        });
      }

      // Sort by days until and limit
      return upcoming
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, limit);
    } catch (error) {
      console.error('[AdminDashboardAdapter] Error fetching upcoming birthdays:', error);
      return [];
    }
  }

  async fetchQuickLinks(): Promise<QuickLink[]> {
    // Return static quick links - these could be made dynamic/configurable in the future
    return [
      {
        id: 'members',
        title: 'Members',
        description: 'View and manage church members',
        href: '/admin/members',
        icon: 'users',
        category: 'membership',
      },
      {
        id: 'finances',
        title: 'Finances',
        description: 'Track donations and expenses',
        href: '/admin/finances',
        icon: 'dollar-sign',
        category: 'finances',
      },
      {
        id: 'calendar',
        title: 'Calendar',
        description: 'Manage events and schedules',
        href: '/admin/community/planning-calendar',
        icon: 'calendar',
        category: 'events',
      },
      {
        id: 'messages',
        title: 'Communications',
        description: 'Send messages to members',
        href: '/admin/communications',
        icon: 'message-square',
        category: 'communications',
      },
      {
        id: 'settings',
        title: 'Settings',
        description: 'Configure your church settings',
        href: '/admin/settings',
        icon: 'settings',
        category: 'admin',
      },
      {
        id: 'security',
        title: 'Security',
        description: 'Manage roles and permissions',
        href: '/admin/security/rbac',
        icon: 'shield',
        category: 'admin',
      },
    ];
  }
}
