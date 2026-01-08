/**
 * ================================================================================
 * GOALS & OBJECTIVES PAGE
 * ================================================================================
 *
 * Central hub for church strategic goals, ministry objectives,
 * and key result tracking with progress updates.
 *
 * SECURITY: Protected by AccessGate requiring goals:view permission.
 *
 * METADATA ROUTE: admin-community/planning/goals
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Module header with key metrics
 *   - AdminMetricCards: Goal health statistics (On Track, At Risk, Behind)
 *   - AdminQuickLinks: Navigation to goal tools (Categories, Reports, Calendar)
 *   - AdminDataGridSection: Goals table with filters and actions
 *   - AdminActivityTimeline: Key results needing progress updates
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.hero
 *   - admin-community.planning.goals.metrics
 *   - admin-community.planning.goals.quickLinks
 *   - admin-community.planning.goals.table
 *   - admin-community.planning.goals.upcomingUpdates
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderGoalsPage, type PageSearchParams } from "./metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Goals & Objectives | StewardTrack",
  description: "Set and track church-wide strategic goals, ministry objectives, and key results",
};

export default async function GoalsPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["goals:view"], "any", {
    fallbackPath: "/unauthorized?reason=goals_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderGoalsPage("planning/goals", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
