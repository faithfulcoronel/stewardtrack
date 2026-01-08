/**
 * ================================================================================
 * GOAL DETAIL PAGE
 * ================================================================================
 *
 * Displays detailed information about a single goal including
 * objectives, key results, and progress history.
 *
 * SECURITY: Protected by AccessGate requiring goals:view permission.
 *
 * METADATA ROUTE: admin-community/planning/goals/detail
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-detail.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Goal header with title, category, status
 *   - AdminSummaryPanelsSection: Detailed goal information
 *   - AdminDataGridSection: Objectives list
 *   - AdminDataGridSection: Key results list
 *   - AdminActivityTimeline: Recent activity feed
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.detail.hero
 *   - admin-community.planning.goals.detail.summary
 *   - admin-community.planning.goals.detail.objectives
 *   - admin-community.planning.goals.detail.keyResults
 *   - admin-community.planning.goals.detail.activity
 *
 * PERMISSIONS:
 *   - goals:view - Required to view the page
 *   - goals:edit - Required to edit the goal
 *   - goals:delete - Required to delete the goal
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderGoalsPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ goalId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Goal Details | StewardTrack",
  description: "View goal details, objectives, key results, and progress",
};

export default async function GoalDetailPage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["goals:view"], "any", {
    fallbackPath: "/unauthorized?reason=goals_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Pass goalId to the metadata renderer
  const { content } = await renderGoalsPage("planning/goals/detail", {
    ...resolvedSearchParams,
    goalId: resolvedParams.goalId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
