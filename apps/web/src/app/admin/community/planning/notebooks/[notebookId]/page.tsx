/**
 * ================================================================================
 * NOTEBOOK DETAIL PAGE
 * ================================================================================
 *
 * Detailed view of a single notebook with its sections and pages.
 * Displays hierarchical structure similar to OneNote navigation pane.
 *
 * SECURITY: Protected by AccessGate requiring notebooks:view permission.
 * Row-level security enforced via has_notebook_access() function.
 *
 * METADATA ROUTE: admin-community/planning/notebooks-detail
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-notebooks-detail.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Notebook header with title, description, metadata
 *   - NotebookSectionTree: Collapsible sections with pages
 *   - AdminActivityTimeline: Recent changes and actions
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.notebooks.detail.hero
 *   - admin-community.planning.notebooks.detail.sections
 *   - admin-community.planning.notebooks.detail.activity
 *
 * ROUTE PARAMS:
 *   - notebookId: UUID of the notebook to display
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderNotebooksPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ notebookId: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Notebook Details | StewardTrack",
  description: "View notebook sections, pages, and recent activity",
};

export default async function NotebookDetailPage({ params, searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:view"], "any", {
    fallbackPath: "/unauthorized?reason=notebooks_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Pass notebookId as a search param so service handlers can access it
  const paramsWithNotebookId = {
    ...resolvedSearchParams,
    notebookId: resolvedParams.notebookId,
  };

  const { content } = await renderNotebooksPage("planning/notebooks-detail", paramsWithNotebookId);

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
