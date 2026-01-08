/**
 * ================================================================================
 * GOAL CATEGORY CREATE/EDIT PAGE
 * ================================================================================
 *
 * Provides create/edit functionality for goal categories.
 * It serves two modes:
 *   - CREATE: /admin/community/planning/goals/categories/create (no query param)
 *   - EDIT:   /admin/community/planning/goals/categories/create?categoryId=xxx
 *
 * SECURITY: Protected by AccessGate requiring goals:create permission.
 *
 * METADATA ROUTE: admin-community/planning/goals/categories/create
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-categories-manage.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Mode-aware header (Create/Edit)
 *   - AdminFormSection: Dynamic form for category data
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.categories.manage.hero
 *   - admin-community.planning.goals.categories.manage.form
 *   - admin-community.planning.goals.categories.manage.save
 *
 * PERMISSIONS:
 *   - goals:create - Required to create/edit categories
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderGoalsPage, type PageSearchParams } from "../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Create Category | StewardTrack",
  description: "Create a new goal category",
};

export default async function CategoryCreatePage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["goals:create"], "any", {
    fallbackPath: "/unauthorized?reason=goals_create_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderGoalsPage("planning/goals/categories/create", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
