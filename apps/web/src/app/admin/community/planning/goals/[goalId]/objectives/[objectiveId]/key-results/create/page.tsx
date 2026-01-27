/**
 * ================================================================================
 * KEY RESULT CREATE/EDIT PAGE (OBJECTIVE-LEVEL)
 * ================================================================================
 *
 * Creates or edits a key result linked to an objective (which is part of a goal).
 *
 * SECURITY: Protected by AccessGate requiring key_results:manage permission.
 * @permission key_results:manage - Required to create or edit key results
 *
 * METADATA ROUTE: admin-community/planning/goals/objectives/key-results/create
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-objectives-key-results-manage.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Mode-aware header (Create/Edit)
 *   - AdminFormSection: Key result form
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.objectives.keyResults.manage.hero
 *   - admin-community.planning.goals.objectives.keyResults.manage.form
 *   - admin-community.planning.goals.objectives.keyResults.manage.save
 *
 * PERMISSIONS:
 *   - key_results:manage - Required to create/edit key results
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderGoalsPage, type PageSearchParams } from "../../../../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ goalId: string; objectiveId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Create Key Result | StewardTrack",
  description: "Create a new key result for an objective",
};

export default async function ObjectiveKeyResultCreatePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["key_results:manage"], "any", {
    fallbackPath: "/unauthorized?reason=key_results_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Pass goalId, objectiveId, and keyResultId (for edit mode) to the metadata renderer
  const { content } = await renderGoalsPage("planning/goals/objectives/key-results/create", {
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
