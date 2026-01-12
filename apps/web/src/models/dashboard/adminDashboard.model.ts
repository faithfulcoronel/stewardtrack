/**
 * Admin Dashboard Models
 *
 * Contains all type definitions for the admin dashboard feature.
 * These models are designed to be extensible for future features.
 */

// ==================== WELCOME SECTION ====================
export interface WelcomeData {
  userName: string;
  userEmail: string;
  tenantId: string | null;
  tenantName: string;
  tenantLogoUrl: string | null;
  lastSignIn: string | null;
  currentTime: string;
  greeting: string;
}

// ==================== BIBLE VERSE ====================
export interface BibleVerse {
  reference: string;
  text: string;
  version: string;
}

// ==================== SUMMARY METRICS ====================
export interface DashboardMetrics {
  members: MemberMetricsSummary;
  finances: FinanceMetricsSummary;
  events: EventMetricsSummary;
  engagement: EngagementMetricsSummary;
}

export interface MemberMetricsSummary {
  total: number;
  newThisMonth: number;
  activeCount: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface FinanceMetricsSummary {
  totalDonationsThisMonth: number;
  donationCount: number;
  averageDonation: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  currency: string;
}

export interface EventMetricsSummary {
  upcomingCount: number;
  thisWeekCount: number;
  attendanceRate: number;
}

export interface EngagementMetricsSummary {
  activeVolunteers: number;
  smallGroupsCount: number;
  checkInsToday: number;
}

// ==================== QUICK LINKS ====================
export interface QuickLink {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: QuickLinkIcon;
  category: QuickLinkCategory;
  badge?: string;
  isNew?: boolean;
}

export type QuickLinkIcon =
  | 'users'
  | 'dollar-sign'
  | 'calendar'
  | 'message-square'
  | 'settings'
  | 'shield'
  | 'file-text'
  | 'bar-chart'
  | 'heart'
  | 'church'
  | 'book'
  | 'bell';

export type QuickLinkCategory =
  | 'membership'
  | 'finances'
  | 'events'
  | 'communications'
  | 'admin'
  | 'reports';

// ==================== HIGHLIGHTS / ATTENTION ITEMS ====================
export interface DashboardHighlight {
  id: string;
  type: HighlightType;
  priority: HighlightPriority;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export type HighlightType =
  | 'birthday'
  | 'anniversary'
  | 'follow-up'
  | 'event-reminder'
  | 'task-due'
  | 'approval-needed'
  | 'system-alert'
  | 'milestone';

export type HighlightPriority = 'low' | 'medium' | 'high' | 'urgent';

// ==================== RECENT ACTIVITY ====================
export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  entityType?: string;
  entityId?: string;
}

export type ActivityType =
  | 'member_added'
  | 'member_updated'
  | 'donation_received'
  | 'event_created'
  | 'event_updated'
  | 'message_sent'
  | 'task_completed'
  | 'setting_changed';

// ==================== UPCOMING EVENTS ====================
export interface UpcomingEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  category?: string;
  attendeeCount?: number;
}

// ==================== BIRTHDAYS ====================
export interface UpcomingBirthday {
  memberId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  daysUntil: number;
  profilePictureUrl?: string | null;
}

// ==================== FULL DASHBOARD DATA ====================
export interface AdminDashboardData {
  welcome: WelcomeData;
  bibleVerse: BibleVerse;
  metrics: DashboardMetrics;
  quickLinks: QuickLink[];
  highlights: DashboardHighlight[];
  recentActivity: RecentActivity[];
  upcomingEvents: UpcomingEvent[];
  upcomingBirthdays: UpcomingBirthday[];
  lastUpdated: string;
}

// ==================== API RESPONSE TYPES ====================
export interface DashboardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ==================== CONFIGURATION ====================
export interface DashboardConfig {
  refreshInterval: number; // in milliseconds
  maxHighlights: number;
  maxRecentActivity: number;
  maxUpcomingEvents: number;
  maxBirthdays: number;
  enableBibleVerse: boolean;
  bibleVerseVersion: string;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  refreshInterval: 300000, // 5 minutes
  maxHighlights: 5,
  maxRecentActivity: 10,
  maxUpcomingEvents: 5,
  maxBirthdays: 7,
  enableBibleVerse: true,
  bibleVerseVersion: 'NIV',
};
