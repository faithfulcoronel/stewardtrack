/**
 * ================================================================================
 * GOALS PROGRESS REPORTS PAGE
 * ================================================================================
 *
 * View detailed reports on goal achievement, progress trends, and performance
 * metrics across all strategic goals and ministry objectives.
 *
 * SECURITY: Protected by AccessGate requiring goals:view permission.
 * @permission goals:view - Required to view goals reports
 *
 * METADATA ROUTE: admin-community/planning/goals/reports
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-reports.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Page header with report overview
 *   - AdminMetricCards: Summary statistics
 *   - Progress trend charts and visualizations
 *   - Goal completion breakdown by category/status
 *   - Export functionality
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
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Progress Reports | Goals & Objectives | StewardTrack",
  description: "View detailed reports on goal achievement and progress trends",
};

export default async function GoalsReportsPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["goals:view"], "any", {
    fallbackPath: "/unauthorized?reason=goals_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderGoalsPage("planning/goals/reports", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
