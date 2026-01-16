'use client';

import { useCallback } from 'react';
import { DashboardHero } from './sections/DashboardHero';
import { MyFocusToday } from './sections/MyFocusToday';
import { QuickActionsSection } from './sections/QuickActionsSection';
import { ChurchPulseSection } from './sections/ChurchPulseSection';
import { FinancialOverview } from './sections/FinancialOverview';
import { PastoralCareSection } from './sections/PastoralCareSection';
import { CommunitySection } from './sections/CommunitySection';
import { MyJourneySection } from './sections/MyJourneySection';
import { usePersonaDashboard } from '@/hooks/usePersonaDashboard';

/**
 * Persona-Based Dashboard
 *
 * A unified dashboard that adapts its content based on the user's role.
 * Each section checks the user's role and only renders if relevant.
 *
 * Role visibility:
 * - Hero: All roles (personalized greeting)
 * - My Focus Today: All roles (role-specific tasks)
 * - Quick Actions: All roles (filtered by permissions)
 * - Church Pulse: Leadership roles (admin, pastors, elders)
 * - Financial Overview: Finance roles (treasurer, auditor, admin)
 * - Pastoral Care: Pastoral roles (pastors, care coordinators)
 * - Community: All roles (events, birthdays)
 * - My Journey: Members, volunteers, visitors
 */
export function PersonaBasedDashboard() {
  const {
    data,
    isLoading,
    error,
    userRoles,
    timezone,
    refetch,
    refreshBibleVerse,
    isRefreshingVerse
  } = usePersonaDashboard();

  const handleRefreshVerse = useCallback(() => {
    refreshBibleVerse();
  }, [refreshBibleVerse]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">🙏</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Helper to check if user has any of the specified roles
  const hasRole = (...roles: string[]) => {
    return roles.some(role => userRoles.includes(role));
  };

  // Role groups for section visibility
  const isLeadership = hasRole(
    'role_tenant_admin',
    'role_senior_pastor',
    'role_associate_pastor',
    'role_deacon_elder'
  );

  const isPastoral = hasRole(
    'role_senior_pastor',
    'role_associate_pastor'
  );

  const isFinance = hasRole(
    'role_tenant_admin',
    'role_treasurer',
    'role_auditor',
    'role_deacon_elder'
  );

  const isMinistry = hasRole(
    'role_ministry_leader',
    'role_volunteer'
  );

  const isMemberOrVisitor = hasRole(
    'role_member',
    'role_visitor'
  ) || (!isLeadership && !isPastoral && !isFinance && !isMinistry);

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section - All Roles */}
      <DashboardHero
        data={data?.welcome}
        bibleVerse={data?.bibleVerse}
        userRoles={userRoles}
        isLoading={isLoading}
        onRefreshVerse={handleRefreshVerse}
        isRefreshingVerse={isRefreshingVerse}
      />

      {/* My Focus Today - All Roles (content varies by role) */}
      <MyFocusToday
        highlights={data?.highlights}
        userRoles={userRoles}
        isLoading={isLoading}
      />

      {/* Quick Actions - All Roles (filtered by permissions) */}
      <QuickActionsSection
        links={data?.quickLinks}
        userRoles={userRoles}
        isLoading={isLoading}
      />

      {/* Church Pulse - Leadership Roles Only */}
      {isLeadership && (
        <ChurchPulseSection
          metrics={data?.metrics}
          isLoading={isLoading}
        />
      )}

      {/* Financial Overview - Finance Roles Only */}
      {isFinance && (
        <FinancialOverview
          metrics={data?.metrics?.finances}
          userRoles={userRoles}
          pendingApprovals={data?.pendingApprovals}
          isLoading={isLoading}
        />
      )}

      {/* Pastoral Care - Pastoral Roles Only */}
      {isPastoral && (
        <PastoralCareSection
          carePlans={data?.carePlansSummary}
          followUps={data?.followUps}
          isLoading={isLoading}
        />
      )}

      {/* Community Section - All Roles */}
      <CommunitySection
        upcomingEvents={data?.calendarEvents}
        celebrations={data?.celebrations}
        announcements={data?.announcements}
        timezone={timezone}
        isLoading={isLoading}
      />

      {/* My Journey - Members, Volunteers, Visitors */}
      {(isMemberOrVisitor || isMinistry) && (
        <MyJourneySection
          userRoles={userRoles}
          milestones={data?.journeyMilestones}
          opportunities={data?.growthOpportunities}
          serviceRecords={data?.serviceRecords}
          memberSince={data?.memberSince}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
