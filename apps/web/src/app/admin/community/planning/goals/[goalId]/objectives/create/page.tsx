/**
 * ================================================================================
 * OBJECTIVE CREATE/EDIT PAGE
 * ================================================================================
 *
 * Creates or edits an objective for a specific goal.
 *
 * SECURITY: Protected by AccessGate requiring objectives:create permission.
 *
 * METADATA ROUTE: admin-community/planning/goals/objectives/create
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-objectives-manage.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Mode-aware header (Create/Edit)
 *   - AdminFormSection: Objective form
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.objectives.manage.hero
 *   - admin-community.planning.goals.objectives.manage.form
 *   - admin-community.planning.goals.objectives.manage.save
 *
 * PERMISSIONS:
 *   - objectives:create - Required to create a new objective
 *   - objectives:edit   - Required to edit an existing objective
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
  params: Awaitable<{ goalId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Create Objective | StewardTrack",
  description: "Create a new objective for a goal",
};

export default async function ObjectiveCreatePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["objectives:manage"], "any", {
    fallbackPath: "/unauthorized?reason=objectives_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Pass goalId and objectiveId (for edit mode) to the metadata renderer
  const { content } = await renderGoalsPage("planning/goals/objectives/create", {
    ...resolvedSearchParams,
    goalId: resolvedParams.goalId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
