/**
 * ================================================================================
 * OBJECTIVE DETAIL/EDIT PAGE
 * ================================================================================
 *
 * Displays objective details with ability to edit and manage key results.
 *
 * SECURITY: Protected by AccessGate requiring objectives:view permission.
 * @permission objectives:view, objectives:manage - Required to view or manage objectives
 *
 * METADATA ROUTE: admin-community/planning/goals/objectives/detail
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-objectives-detail.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Objective header with status and progress
 *   - AdminFormSection: Edit objective details
 *   - KeyResultsSection: List of key results with progress tracking
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.objectives.detail.hero
 *   - admin-community.planning.goals.objectives.detail.form
 *   - admin-community.planning.goals.objectives.detail.keyResults
 *
 * PERMISSIONS:
 *   - objectives:view - Required to view objective details
 *   - objectives:manage - Required to edit objective
 *   - key_results:manage - Required to add key results
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderGoalsPage, type PageSearchParams } from "../../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ goalId: string; objectiveId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Objective Details | StewardTrack",
  description: "View and manage objective details",
};

export default async function ObjectiveDetailPage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["objectives:view", "objectives:manage"], "any", {
    fallbackPath: "/unauthorized?reason=objectives_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Pass goalId and objectiveId to the metadata renderer
  const { content } = await renderGoalsPage("planning/goals/objectives/detail", {
    ...resolvedSearchParams,
    goalId: resolvedParams.goalId,
    objectiveId: resolvedParams.objectiveId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
