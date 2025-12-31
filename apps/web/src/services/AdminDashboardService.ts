import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IAdminDashboardRepository } from '@/repositories/adminDashboard.repository';
import {
  DEFAULT_DASHBOARD_CONFIG,
  type AdminDashboardData,
  type WelcomeData,
  type BibleVerse,
  type DashboardMetrics,
  type DashboardHighlight,
  type RecentActivity,
  type UpcomingEvent,
  type UpcomingBirthday,
  type QuickLink,
  type DashboardConfig,
} from '@/models/dashboard/adminDashboard.model';

/**
 * Admin Dashboard Service
 *
 * Provides business logic for the admin dashboard, including:
 * - Aggregating data from multiple sources
 * - Caching and optimization
 * - Permission-based data filtering
 *
 * This service follows the layered architecture pattern:
 * API Route -> Service -> Repository -> Adapter -> Database
 */
@injectable()
export class AdminDashboardService {
  constructor(
    @inject(TYPES.IAdminDashboardRepository)
    private repository: IAdminDashboardRepository
  ) {}

  /**
   * Get the complete dashboard data in a single call
   * Fetches all sections in parallel for optimal performance
   */
  async getDashboardData(
    userId: string,
    userEmail: string,
    lastSignIn: string | null,
    config: Partial<DashboardConfig> = {}
  ): Promise<AdminDashboardData> {
    const mergedConfig = { ...DEFAULT_DASHBOARD_CONFIG, ...config };

    // Fetch all data in parallel for performance
    const [
      welcomeData,
      bibleVerse,
      metrics,
      quickLinks,
      highlights,
      recentActivity,
      upcomingEvents,
      upcomingBirthdays,
    ] = await Promise.all([
      this.getWelcomeData(userId, userEmail, lastSignIn),
      mergedConfig.enableBibleVerse ? this.getBibleVerse() : Promise.resolve({ reference: '', text: '', version: '' }),
      this.getMetrics(),
      this.getQuickLinks(),
      this.getHighlights(mergedConfig.maxHighlights),
      this.getRecentActivity(mergedConfig.maxRecentActivity),
      this.getUpcomingEvents(mergedConfig.maxUpcomingEvents),
      this.getUpcomingBirthdays(mergedConfig.maxBirthdays),
    ]);

    return {
      welcome: welcomeData,
      bibleVerse,
      metrics,
      quickLinks,
      highlights,
      recentActivity,
      upcomingEvents,
      upcomingBirthdays,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get welcome data for the current user
   */
  async getWelcomeData(
    userId: string,
    userEmail: string,
    lastSignIn: string | null
  ): Promise<WelcomeData> {
    const data = await this.repository.getWelcomeData(userId, userEmail);
    return {
      ...data,
      lastSignIn,
    };
  }

  /**
   * Get the Bible verse of the day
   */
  async getBibleVerse(): Promise<BibleVerse> {
    return this.repository.getBibleVerse();
  }

  /**
   * Get all dashboard metrics
   */
  async getMetrics(): Promise<DashboardMetrics> {
    return this.repository.getAllMetrics();
  }

  /**
   * Get dashboard highlights (items needing attention)
   */
  async getHighlights(limit?: number): Promise<DashboardHighlight[]> {
    return this.repository.getHighlights(limit);
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(limit?: number): Promise<RecentActivity[]> {
    return this.repository.getRecentActivity(limit);
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit?: number): Promise<UpcomingEvent[]> {
    return this.repository.getUpcomingEvents(limit);
  }

  /**
   * Get upcoming birthdays
   */
  async getUpcomingBirthdays(limit?: number): Promise<UpcomingBirthday[]> {
    return this.repository.getUpcomingBirthdays(limit);
  }

  /**
   * Get quick links for navigation
   */
  async getQuickLinks(): Promise<QuickLink[]> {
    return this.repository.getQuickLinks();
  }
}
