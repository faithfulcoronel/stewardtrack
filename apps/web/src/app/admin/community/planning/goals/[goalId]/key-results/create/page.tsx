/**
 * ================================================================================
 * KEY RESULT CREATE/EDIT PAGE (GOAL-LEVEL)
 * ================================================================================
 *
 * Creates or edits a key result linked directly to a goal.
 *
 * SECURITY: Protected by AccessGate requiring key_results:manage permission.
 *
 * METADATA ROUTE: admin-community/planning/goals/key-results/create
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-key-results-manage.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Mode-aware header (Create/Edit)
 *   - AdminFormSection: Key result form
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.keyResults.manage.hero
 *   - admin-community.planning.goals.keyResults.manage.form
 *   - admin-community.planning.goals.keyResults.manage.save
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

import { renderGoalsPage, type PageSearchParams } from "../../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ goalId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Create Key Result | StewardTrack",
  description: "Create a new key result for a goal",
};

export default async function KeyResultCreatePage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["key_results:manage"], "any", {
    fallbackPath: "/unauthorized?reason=key_results_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Pass goalId and keyResultId (for edit mode) to the metadata renderer
  const { content } = await renderGoalsPage("planning/goals/key-results/create", {
    ...resolvedSearchParams,
    goalId: resolvedParams.goalId,
  });

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
