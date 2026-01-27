/**
 * ================================================================================
 * NOTEBOOKS MANAGE PAGE
 * ================================================================================
 *
 * Unified page for creating new notebooks and editing existing ones.
 * Adapts based on the presence of notebookId query parameter.
 *
 * SECURITY: Protected by AccessGate requiring notebooks:manage permission.
 * @permission notebooks:manage - Required to create or edit notebooks
 *
 * METADATA ROUTE: admin-community/planning/notebooks/manage
 * XML BLUEPRINT: metadata/authoring/blueprints/admin-community/planning-notebooks-manage.xml
 *
 * PAGE STRUCTURE (from XML):
 *   - HeroSection: Adaptive header (Create/Edit mode)
 *   - AdminFormSection: Notebook details form with inline actions
 *
 * SERVICE HANDLERS USED:
 *   - admin-community.planning.notebooks.manage.form
 *   - admin-community.planning.notebooks.save
 *
 * USAGE:
 *   - Create: /admin/community/planning/notebooks/manage
 *   - Edit: /admin/community/planning/notebooks/manage?notebookId={id}
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
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage Notebook | StewardTrack",
  description: "Create or edit notebook details",
};

export default async function ManageNotebookPage({ searchParams }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["notebooks:manage"], "all", {
    fallbackPath: "/unauthorized?reason=notebooks_write_required",
  });

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderNotebooksPage("planning/notebooks/manage", resolvedSearchParams ?? {});

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="space-y-10">{content}</div>
    </ProtectedPage>
  );
}
