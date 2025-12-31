import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IAdminDashboardAdapter } from '@/adapters/adminDashboard.adapter';
import type {
  WelcomeData,
  BibleVerse,
  MemberMetricsSummary,
  FinanceMetricsSummary,
  EventMetricsSummary,
  EngagementMetricsSummary,
  DashboardMetrics,
  DashboardHighlight,
  RecentActivity,
  UpcomingEvent,
  UpcomingBirthday,
  QuickLink,
} from '@/models/dashboard/adminDashboard.model';

/**
 * Repository Interface for Admin Dashboard
 */
export interface IAdminDashboardRepository {
  getWelcomeData(userId: string, userEmail: string): Promise<WelcomeData>;
  getBibleVerse(): Promise<BibleVerse>;
  getMemberMetrics(): Promise<MemberMetricsSummary>;
  getFinanceMetrics(): Promise<FinanceMetricsSummary>;
  getEventMetrics(): Promise<EventMetricsSummary>;
  getEngagementMetrics(): Promise<EngagementMetricsSummary>;
  getAllMetrics(): Promise<DashboardMetrics>;
  getHighlights(limit?: number): Promise<DashboardHighlight[]>;
  getRecentActivity(limit?: number): Promise<RecentActivity[]>;
  getUpcomingEvents(limit?: number): Promise<UpcomingEvent[]>;
  getUpcomingBirthdays(limit?: number): Promise<UpcomingBirthday[]>;
  getQuickLinks(): Promise<QuickLink[]>;
}

/**
 * Admin Dashboard Repository
 *
 * Provides a clean interface between the service layer and the data access layer.
 * Delegates all data fetching to the adapter.
 */
@injectable()
export class AdminDashboardRepository implements IAdminDashboardRepository {
  constructor(
    @inject(TYPES.IAdminDashboardAdapter)
    private adapter: IAdminDashboardAdapter
  ) {}

  /**
   * Get welcome data for the dashboard header
   */
  getWelcomeData(userId: string, userEmail: string): Promise<WelcomeData> {
    return this.adapter.fetchWelcomeData(userId, userEmail);
  }

  /**
   * Get the Bible verse of the day
   */
  getBibleVerse(): Promise<BibleVerse> {
    return this.adapter.fetchBibleVerse();
  }

  /**
   * Get member metrics summary
   */
  getMemberMetrics(): Promise<MemberMetricsSummary> {
    return this.adapter.fetchMemberMetrics();
  }

  /**
   * Get finance metrics summary
   */
  getFinanceMetrics(): Promise<FinanceMetricsSummary> {
    return this.adapter.fetchFinanceMetrics();
  }

  /**
   * Get event metrics summary
   */
  getEventMetrics(): Promise<EventMetricsSummary> {
    return this.adapter.fetchEventMetrics();
  }

  /**
   * Get engagement metrics summary
   */
  getEngagementMetrics(): Promise<EngagementMetricsSummary> {
    return this.adapter.fetchEngagementMetrics();
  }

  /**
   * Get all metrics in a single call (parallel fetching)
   */
  async getAllMetrics(): Promise<DashboardMetrics> {
    const [members, finances, events, engagement] = await Promise.all([
      this.getMemberMetrics(),
      this.getFinanceMetrics(),
      this.getEventMetrics(),
      this.getEngagementMetrics(),
    ]);

    return {
      members,
      finances,
      events,
      engagement,
    };
  }

  /**
   * Get dashboard highlights (items needing attention)
   */
  getHighlights(limit = 5): Promise<DashboardHighlight[]> {
    return this.adapter.fetchHighlights(limit);
  }

  /**
   * Get recent activity feed
   */
  getRecentActivity(limit = 10): Promise<RecentActivity[]> {
    return this.adapter.fetchRecentActivity(limit);
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(limit = 5): Promise<UpcomingEvent[]> {
    return this.adapter.fetchUpcomingEvents(limit);
  }

  /**
   * Get upcoming birthdays
   */
  getUpcomingBirthdays(limit = 7): Promise<UpcomingBirthday[]> {
    return this.adapter.fetchUpcomingBirthdays(limit);
  }

  /**
   * Get quick links for navigation
   */
  getQuickLinks(): Promise<QuickLink[]> {
    return this.adapter.fetchQuickLinks();
  }
}
