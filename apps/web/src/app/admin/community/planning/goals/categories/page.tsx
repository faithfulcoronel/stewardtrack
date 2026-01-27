/**
 * ================================================================================
 * GOAL CATEGORIES LIST PAGE
 * ================================================================================
 *
 * Displays all goal categories with CRUD functionality.
 *
 * SECURITY: Protected by AccessGate requiring goals:view permission.
 * @permission goals:view - Required to view goal categories
 *
 * METADATA ROUTE: admin-community/planning/goals/categories
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-goals-categories.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Page header with add button
 *   - AdminDataGridSection: Categories list
 *   - AdminFormSection: Create/edit form dialog
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.goals.categories.list
 *   - admin-community.planning.goals.categories.form
 *   - admin-community.planning.goals.categories.save
 *   - admin-community.planning.goals.categories.delete
 *
 * PERMISSIONS:
 *   - goals:view   - Required to view the page
 *   - goals:manage - Required to add/edit categories
 *   - goals:delete - Required to delete categories
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
  title: "Goal Categories | StewardTrack",
  description: "Manage goal categories for your church",
};

export default async function GoalCategoriesPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["goals:view"], "any", {
    fallbackPath: "/unauthorized?reason=goals_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderGoalsPage("planning/goals/categories", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
