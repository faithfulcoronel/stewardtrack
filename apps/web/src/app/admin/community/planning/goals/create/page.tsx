/**
 * ================================================================================
 * GOAL CREATE/EDIT PAGE
 * ================================================================================
 *
 * Provides create/edit functionality for goals.
 * It serves two modes:
 *   - CREATE: /admin/community/planning/goals/create (no query param)
 *   - EDIT:   /admin/community/planning/goals/create?goalId=xxx
 *
 * SECURITY: Protected by AccessGate requiring goals:manage permission.
 * @permission goals:manage - Required to create or edit goals
 *
 * METADATA ROUTE: admin-community/planning/goals/create
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-manage.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Mode-aware header (Create/Edit)
 *   - AdminFormSection: Dynamic form for goal data
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.manage.hero
 *   - admin-community.planning.goals.manage.form
 *   - admin-community.planning.goals.manage.save
 *
 * PERMISSIONS:
 *   - goals:manage - Required to create or edit goals
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
  title: "Create Goal | StewardTrack",
  description: "Create a new strategic goal for your church",
};

export default async function GoalCreatePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  // Use goals:create for new goals
  // Note: Edit mode permission check is handled at the service level
  const gate = Gate.withPermission(["goals:manage"], "any", {
    fallbackPath: "/unauthorized?reason=goals_manage_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderGoalsPage("planning/goals/create", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
