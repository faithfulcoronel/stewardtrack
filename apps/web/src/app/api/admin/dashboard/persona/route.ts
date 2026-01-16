import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { AdminDashboardService } from '@/services/AdminDashboardService';
import type { RbacRegistryService } from '@/services/RbacRegistryService';
import type { MemberCarePlanService } from '@/services/MemberCarePlanService';
import type { MemberDiscipleshipMilestoneService } from '@/services/MemberDiscipleshipMilestoneService';
import type { ICalendarEventRepository } from '@/repositories/calendarEvent.repository';
import type { IAnnouncementRepository } from '@/repositories/announcement.repository';
import type { IFinancialTransactionHeaderRepository } from '@/repositories/financialTransactionHeader.repository';
import type { IAdminDashboardRepository } from '@/repositories/adminDashboard.repository';
import type { MinistryService } from '@/services/MinistryService';
import type { UserMemberLinkService } from '@/services/UserMemberLinkService';
import type { MemberService } from '@/services/MemberService';
import type {
  PersonaDashboardData,
  CarePlanSummary,
  FollowUpItem,
  PendingApprovalItem,
  CalendarEvent,
  CelebrationItem,
  AnnouncementItem,
  JourneyMilestone,
  GrowthOpportunity,
  ServiceRecord,
} from '@/models/dashboard/adminDashboard.model';
import { getCurrentTenantId } from '@/lib/server/context';
import { getTenantTimezone } from '@/lib/metadata/services/datetime-utils';

/**
 * GET /api/admin/dashboard/persona
 *
 * Fetches the persona-based admin dashboard data including:
 * - All base dashboard data
 * - User's roles for persona-based rendering
 * - Role-specific data (care plans, follow-ups, approvals, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const lastSignIn = user.last_sign_in_at || null;

    // Get dashboard service
    const dashboardService = container.get<AdminDashboardService>(TYPES.AdminDashboardService);

    // Parse optional query params for configuration
    const { searchParams } = new URL(request.url);
    const maxHighlights = parseInt(searchParams.get('maxHighlights') || '5', 10);
    const maxActivity = parseInt(searchParams.get('maxActivity') || '10', 10);
    const maxEvents = parseInt(searchParams.get('maxEvents') || '5', 10);
    const maxBirthdays = parseInt(searchParams.get('maxBirthdays') || '7', 10);
    const enableBibleVerse = searchParams.get('enableBibleVerse') !== 'false';

    // Fetch base dashboard data
    const baseDashboardData = await dashboardService.getDashboardData(
      user.id,
      user.email || '',
      lastSignIn,
      {
        maxHighlights,
        maxRecentActivity: maxActivity,
        maxUpcomingEvents: maxEvents,
        maxBirthdays,
        enableBibleVerse,
      }
    );

    // Get user role metadata keys from RBAC registry service
    const rbacRegistryService = container.get<RbacRegistryService>(TYPES.RbacRegistryService);
    const tenantId = await getCurrentTenantId();
    const userRoles = await rbacRegistryService.getUserMetadataKeys(user.id, tenantId);

    // Build persona-specific data based on roles
    const personaData = await buildPersonaData(userRoles, user.id, tenantId);

    // Get tenant timezone for client-side date formatting
    const timezone = await getTenantTimezone();

    // Merge base data with persona data
    const data: PersonaDashboardData = {
      ...baseDashboardData,
      ...personaData,
    };

    return NextResponse.json({
      success: true,
      data,
      userRoles,
      timezone,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Persona Dashboard API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Build persona-specific data based on user roles
 * This function returns role-appropriate data for the dashboard sections
 */
async function buildPersonaData(
  userRoles: string[],
  userId: string,
  tenantId: string
): Promise<Partial<PersonaDashboardData>> {
  const data: Partial<PersonaDashboardData> = {};

  // Helper to check roles
  const hasRole = (...roles: string[]) => roles.some(role => userRoles.includes(role));

  const isPastoral = hasRole('role_senior_pastor', 'role_associate_pastor');
  const isFinance = hasRole('role_tenant_admin', 'role_treasurer', 'role_auditor', 'role_deacon_elder');
  const isVolunteer = hasRole('role_volunteer');
  const isMemberOrVisitor = hasRole('role_member', 'role_visitor');

  // Get member ID for the current user (needed for personal journey data)
  let memberId: string | null = null;
  if (isMemberOrVisitor || isVolunteer) {
    try {
      const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
      const memberWithUser = await userMemberLinkService.getMemberByUserId(userId, tenantId);
      memberId = memberWithUser?.id || null;
    } catch {
      // User may not be linked to a member yet
    }
  }

  // Pastoral Care Data (for pastors)
  if (isPastoral) {
    data.carePlansSummary = await getCarePlansSummary();
    data.followUps = await getFollowUps();
  }

  // Finance Data (for finance roles)
  if (isFinance) {
    data.pendingApprovals = await getPendingApprovals();
  }

  // Community Data (for all)
  data.calendarEvents = await getCalendarEvents();
  data.celebrations = await getCelebrations();
  data.announcements = await getAnnouncements();

  // Personal Journey Data (for members/visitors/volunteers)
  if (isMemberOrVisitor || isVolunteer) {
    data.journeyMilestones = await getJourneyMilestones(memberId);
    data.growthOpportunities = await getGrowthOpportunities();
  }

  // Service Records (for volunteers)
  if (isVolunteer) {
    data.serviceRecords = await getServiceRecords(memberId, tenantId);
  }

  return data;
}

// ==================== Data Fetching Functions ====================

/**
 * Get care plan summary statistics for pastoral dashboard
 */
async function getCarePlansSummary(): Promise<CarePlanSummary> {
  try {
    const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
    const stats = await carePlanService.getCarePlanStats();

    // Calculate needsFollowUp from upcoming follow-ups
    const followUps = await carePlanService.getUpcomingFollowUpsForTenant();

    // Calculate completed this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const allPlans = await carePlanService.getCarePlansForTenant();
    const completedThisMonth = allPlans.filter(plan =>
      plan.closed_at && new Date(plan.closed_at) >= startOfMonth
    ).length;

    return {
      total: stats.total,
      active: stats.active,
      needsFollowUp: followUps.length,
      completedThisMonth,
    };
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching care plan summary:', error);
    return { total: 0, active: 0, needsFollowUp: 0, completedThisMonth: 0 };
  }
}

/**
 * Get upcoming follow-ups for pastoral care
 */
async function getFollowUps(): Promise<FollowUpItem[]> {
  try {
    const carePlanService = container.get<MemberCarePlanService>(TYPES.MemberCarePlanService);
    const upcomingFollowUps = await carePlanService.getUpcomingFollowUpsForTenant();

    return upcomingFollowUps.slice(0, 10).map(plan => ({
      id: plan.id,
      memberName: plan.member_id, // This would ideally be resolved to actual name
      type: 'call' as const, // Default type
      reason: plan.details || plan.status_label || 'Follow-up needed',
      dueDate: plan.follow_up_at ?? new Date().toISOString(),
      priority: mapCarePlanPriority(plan.priority ?? null),
    }));
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching follow-ups:', error);
    return [];
  }
}

/**
 * Get pending financial approvals with totals and user names
 */
async function getPendingApprovals(): Promise<PendingApprovalItem[]> {
  try {
    const financialRepo = container.get<IFinancialTransactionHeaderRepository>(
      TYPES.IFinancialTransactionHeaderRepository
    );

    const result = await financialRepo.find({
      filters: {
        status: { operator: 'in', value: ['draft', 'submitted', 'approved'] },
      },
      pagination: { page: 1, pageSize: 10 },
    });

    // Get user names for all created_by IDs
    const creatorIds = [...new Set(result.data.map(t => t.created_by).filter(Boolean))] as string[];
    const userNames = await resolveUserNames(creatorIds);

    // Get transaction totals for each header
    const approvals: PendingApprovalItem[] = [];

    for (const transaction of result.data) {
      // Get total from transaction entries
      const entries = await financialRepo.getTransactionEntries(transaction.id);
      const totalDebit = entries.reduce((sum, entry) => sum + (Number(entry.debit) || 0), 0);
      const totalCredit = entries.reduce((sum, entry) => sum + (Number(entry.credit) || 0), 0);
      const amount = Math.max(totalDebit, totalCredit); // Use the larger of debit/credit as total

      approvals.push({
        id: transaction.id,
        type: 'transaction' as const,
        title: transaction.description || 'Transaction',
        amount,
        submittedBy: userNames[transaction.created_by || ''] || 'Unknown',
        submittedAt: transaction.created_at || new Date().toISOString(),
      });
    }

    return approvals;
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching pending approvals:', error);
    return [];
  }
}

/**
 * Resolve user IDs to display names
 * Priority: 1) Linked member full name, 2) Auth user metadata full_name
 */
async function resolveUserNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const userNames: Record<string, string> = {};
  const tenantId = await getCurrentTenantId();

  try {
    // First, check for linked members using MemberService (priority 1)
    if (tenantId) {
      const memberService = container.get<MemberService>(TYPES.MemberService);

      for (const userId of userIds) {
        try {
          // Use existing service method to get member by user_id
          const result = await memberService.find({
            filters: {
              tenant_id: { operator: 'eq', value: tenantId },
              user_id: { operator: 'eq', value: userId },
            },
            pagination: { page: 1, pageSize: 1 },
          });

          if (result.data && result.data.length > 0) {
            const member = result.data[0];
            if (member.first_name || member.last_name) {
              userNames[userId] = [member.first_name, member.last_name]
                .filter(Boolean)
                .join(' ');
            }
          }
        } catch {
          // Continue to next user if this one fails
        }
      }
    }

    // For users not linked to members, get from auth service (priority 2)
    const unresolvedIds = userIds.filter(id => !userNames[id]);
    if (unresolvedIds.length > 0) {
      const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);

      for (const userId of unresolvedIds) {
        try {
          const userInfo = await authService.getUserById(userId);
          if (userInfo) {
            const fullName = userInfo.user_metadata?.full_name as string | undefined;
            const firstName = userInfo.user_metadata?.first_name as string | undefined;
            const lastName = userInfo.user_metadata?.last_name as string | undefined;

            if (fullName) {
              userNames[userId] = fullName;
            } else if (firstName || lastName) {
              userNames[userId] = [firstName, lastName].filter(Boolean).join(' ');
            } else if (userInfo.email) {
              userNames[userId] = userInfo.email.split('@')[0];
            }
          }
        } catch {
          // Continue to next user if this one fails
        }
      }
    }
  } catch (error) {
    console.error('[Persona Dashboard] Error resolving user names:', error);
  }

  return userNames;
}

/**
 * Get upcoming calendar events
 */
async function getCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const calendarRepo = container.get<ICalendarEventRepository>(TYPES.ICalendarEventRepository);
    const upcomingEvents = await calendarRepo.getUpcoming(14); // Next 14 days

    return upcomingEvents.slice(0, 10).map(event => ({
      id: event.id,
      title: event.title,
      date: event.start_at.split('T')[0],
      time: event.start_at.split('T')[1]?.slice(0, 5) || '00:00',
      location: event.location || undefined,
      type: mapCalendarEventType(event.event_type),
      attendeeCount: undefined,
    }));
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching calendar events:', error);
    return [];
  }
}

/**
 * Get upcoming celebrations (birthdays, anniversaries)
 */
async function getCelebrations(): Promise<CelebrationItem[]> {
  try {
    const dashboardRepo = container.get<IAdminDashboardRepository>(TYPES.IAdminDashboardRepository);
    const upcomingBirthdays = await dashboardRepo.getUpcomingBirthdays(10);

    return upcomingBirthdays.map(birthday => ({
      id: birthday.memberId,
      memberName: `${birthday.firstName} ${birthday.lastName}`,
      profilePictureUrl: birthday.profilePictureUrl,
      type: 'birthday' as const,
      date: birthday.birthday,
      years: birthday.age, // Age they will be turning
    }));
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching celebrations:', error);
    return [];
  }
}

/**
 * Get active announcements
 */
async function getAnnouncements(): Promise<AnnouncementItem[]> {
  try {
    const announcementRepo = container.get<IAnnouncementRepository>(TYPES.IAnnouncementRepository);
    const now = new Date().toISOString();

    const result = await announcementRepo.find({
      filters: {
        active: { operator: 'eq', value: true },
      },
      pagination: { page: 1, pageSize: 5 },
    });

    // Filter for currently active announcements (within date range)
    const activeAnnouncements = result.data.filter(announcement => {
      const startsAt = announcement.starts_at;
      const endsAt = announcement.ends_at;

      if (startsAt && new Date(startsAt) > new Date(now)) return false;
      if (endsAt && new Date(endsAt) < new Date(now)) return false;

      return true;
    });

    return activeAnnouncements.map(announcement => ({
      id: announcement.id,
      title: announcement.message.slice(0, 50) + (announcement.message.length > 50 ? '...' : ''),
      excerpt: announcement.message,
      priority: 'normal' as const,
      postedAt: announcement.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching announcements:', error);
    return [];
  }
}

/**
 * Get journey milestones for a member
 */
async function getJourneyMilestones(memberId: string | null): Promise<JourneyMilestone[]> {
  if (!memberId) return [];

  try {
    const milestoneService = container.get<MemberDiscipleshipMilestoneService>(
      TYPES.MemberDiscipleshipMilestoneService
    );

    const milestones = await milestoneService.getMilestonesForMember(memberId);

    return milestones.slice(0, 5).map(milestone => ({
      id: milestone.id,
      title: milestone.name,
      description: milestone.description || '',
      completed: !!milestone.celebrated_at,
      completedDate: milestone.celebrated_at || undefined,
    }));
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching journey milestones:', error);
    return [];
  }
}

/**
 * Get growth opportunities (ministries and events)
 */
async function getGrowthOpportunities(): Promise<GrowthOpportunity[]> {
  try {
    const ministryService = container.get<MinistryService>(TYPES.MinistryService);
    const ministries = await ministryService.getAll();

    // Return active ministries as service opportunities
    const opportunities = ministries
      .filter(ministry => ministry.is_active)
      .slice(0, 5)
      .map(ministry => ({
        id: ministry.id,
        title: ministry.name,
        type: 'service' as const,
        date: undefined,
        location: undefined,
        spotsAvailable: undefined,
      }));

    return opportunities;
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching growth opportunities:', error);
    return [];
  }
}

/**
 * Get service records for a volunteer
 */
async function getServiceRecords(
  memberId: string | null,
  tenantId: string
): Promise<ServiceRecord[]> {
  if (!memberId) return [];

  try {
    const ministryService = container.get<MinistryService>(TYPES.MinistryService);
    const memberMinistries = await ministryService.getMemberMinistries(memberId, tenantId);

    return memberMinistries.slice(0, 5).map(team => ({
      id: team.id,
      ministry: team.ministry_id,
      role: team.role || 'Team Member',
      nextServing: undefined,
      hoursThisMonth: undefined,
    }));
  } catch (error) {
    console.error('[Persona Dashboard] Error fetching service records:', error);
    return [];
  }
}

// ==================== Helper Functions ====================

/**
 * Map care plan priority to dashboard priority
 */
function mapCarePlanPriority(priority: string | null): 'high' | 'medium' | 'low' {
  switch (priority?.toLowerCase()) {
    case 'urgent':
    case 'critical':
    case 'high':
      return 'high';
    case 'normal':
    case 'medium':
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Map calendar event type to dashboard event type
 */
function mapCalendarEventType(
  eventType: string
): 'service' | 'meeting' | 'fellowship' | 'outreach' | 'special' {
  switch (eventType) {
    case 'service':
      return 'service';
    case 'meeting':
      return 'meeting';
    case 'event':
    case 'general':
      return 'fellowship';
    case 'goal':
    case 'reminder':
      return 'special';
    default:
      return 'special';
  }
}
