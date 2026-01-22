/**
 * ================================================================================
 * NOTEBOOKS PAGE
 * ================================================================================
 *
 * OneNote-style notebook system for organizing ministry notes,
 * meeting minutes, and documentation with hierarchical sections.
 *
 * SECURITY: Protected by AccessGate requiring notebooks:view permission.
 *
 * METADATA ROUTE: admin-community/planning/notebooks
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-notebooks.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Module header with key metrics (total, my notebooks, shared)
 *   - AdminMetricCards: Notebook statistics
 *   - AdminQuickLinks: Navigation to notebook actions (Create, My Notebooks, Shared, Favorites)
 *   - NotebookCard: Grid view of notebooks with visibility badges
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.notebooks.hero
 *   - admin-community.planning.notebooks.metrics
 *   - admin-community.planning.notebooks.quicklinks
 *   - admin-community.planning.notebooks.cards
 *
 * FEATURES:
 *   - Private, shared, or tenant-wide notebooks
 *   - OneNote-style sections and pages
 *   - Rich text editing with attachments
 *   - Favorite pages for quick access
 *   - Activity tracking and audit log
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";

import { renderNotebooksPage, type PageSearchParams } from "./metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Notebooks | StewardTrack",
  description: "Organize your ministry notes, meeting minutes, and documentation in OneNote-style notebooks",
};

export default async function NotebooksPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["notebooks:view"], "any", {
    fallbackPath: "/unauthorized?reason=notebooks_access",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderNotebooksPage("planning/notebooks", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
