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
  userProfilePictureUrl: string | null;
  tenantId: string | null;
  tenantName: string;
  tenantLogoUrl: string | null;
  /** Church image URL for hero section background (uploaded during onboarding) */
  churchImageUrl: string | null;
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
  | 'milestone'
  | 'setup';

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
  age?: number; // Calculated age they will be turning
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

// ==================== PERSONA-BASED DASHBOARD ====================

/**
 * Care Plan Summary for Pastoral Roles
 */
export interface CarePlanSummary {
  total: number;
  active: number;
  needsFollowUp: number;
  completedThisMonth: number;
}

/**
 * Follow-up Item for Pastoral Care
 */
export interface FollowUpItem {
  id: string;
  memberName: string;
  type: 'call' | 'visit' | 'message';
  reason: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Pending Approval Item for Finance Roles
 */
export interface PendingApprovalItem {
  id: string;
  type: 'transaction' | 'budget' | 'expense';
  title: string;
  amount: number;
  submittedBy: string;
  submittedAt: string;
}

/**
 * Celebration Item (birthday, anniversary, membership)
 */
export interface CelebrationItem {
  id: string;
  memberName: string;
  profilePictureUrl?: string | null;
  type: 'birthday' | 'anniversary' | 'membership';
  date: string;
  years?: number;
}

/**
 * Announcement Item
 */
export interface AnnouncementItem {
  id: string;
  title: string;
  excerpt: string;
  priority: 'high' | 'normal';
  postedAt: string;
}

/**
 * Journey Milestone for Members/Visitors
 */
export interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedDate?: string;
}

/**
 * Growth Opportunity
 */
export interface GrowthOpportunity {
  id: string;
  title: string;
  type: 'class' | 'group' | 'service' | 'event';
  date?: string;
  location?: string;
  spotsAvailable?: number;
}

/**
 * Service Record for Volunteers
 */
export interface ServiceRecord {
  id: string;
  ministry: string;
  role: string;
  nextServing?: string;
  hoursThisMonth?: number;
}

/**
 * Calendar Event with type
 */
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  type: 'service' | 'meeting' | 'fellowship' | 'outreach' | 'special';
  attendeeCount?: number;
}

/**
 * Persona-Based Dashboard Data
 * Extends the base dashboard data with role-specific information
 */
export interface PersonaDashboardData extends AdminDashboardData {
  // Pastoral Care (for pastors)
  carePlansSummary?: CarePlanSummary;
  followUps?: FollowUpItem[];

  // Finance (for treasurer/auditor)
  pendingApprovals?: PendingApprovalItem[];

  // Community (for all)
  calendarEvents?: CalendarEvent[];
  celebrations?: CelebrationItem[];
  announcements?: AnnouncementItem[];

  // Personal Journey (for members/visitors/volunteers)
  journeyMilestones?: JourneyMilestone[];
  growthOpportunities?: GrowthOpportunity[];
  serviceRecords?: ServiceRecord[];
  memberSince?: string;
}
