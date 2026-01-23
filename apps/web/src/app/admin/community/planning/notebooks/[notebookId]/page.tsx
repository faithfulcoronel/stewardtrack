/**
 * ================================================================================
 * NOTEBOOK DETAIL PAGE (OneNote-Style Layout)
 * ================================================================================
 *
 * Single-page notebook view with sidebar navigation and inline content display.
 * Inspired by Microsoft OneNote's interface.
 *
 * ARCHITECTURE: Direct service injection (following members module pattern)
 * - Uses container.get() for NotebookService
 * - Client-side interactivity for page selection
 * - Permission-based visibility
 * - Suspense for loading states
 *
 * SECURITY: Protected by AccessGate requiring members:view permission.
 * Row-level security enforced at database level.
 *
 * LAYOUT:
 * - Left sidebar: Notebook info, sections, and pages navigation
 * - Main area: Selected page content with edit controls
 * - All-in-one page: No navigation to separate pages
 *
 * ================================================================================
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { NotebookService } from "@/services/NotebookService";
import { getUserPermissionCodes } from "@/lib/rbac/permissionHelpers";
import { Skeleton } from "@/components/ui/skeleton";
import { NotebookLayout } from "@/components/notebooks/NotebookLayout";

type Awaitable<T> = T | Promise<T>;

interface PageParams {
  notebookId: string;
}

interface PageProps {
  params: Awaitable<PageParams>;
}

export const metadata: Metadata = {
  title: "Notebook | StewardTrack",
  description: "OneNote-style notebook with sections and pages",
};

export const dynamic = "force-dynamic";

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

function NotebookSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar Skeleton */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="p-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      {/* Content Skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

async function NotebookContent({ notebookId }: { notebookId: string }) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  if (!userId || !tenantId) {
    redirect("/auth/login");
  }

  // Get user's actual permissions
  const userPermissions = await getUserPermissionCodes(userId, tenantId);

  // Fetch notebook with sections and pages
  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const notebook = await notebookService.getNotebookWithSections(notebookId);

  if (!notebook) {
    notFound();
  }

  // Permission checks
  const hasAny = (perms: string[]) => perms.some(p => userPermissions.includes(p));
  const canEdit = hasAny(["members:edit", "members:create"]);

  return <NotebookLayout notebook={notebook} canEdit={canEdit} />;
}

export default async function NotebookDetailPage({ params }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  // Page-level access gate - requires at least members:view permission
  const gate = Gate.withPermission(["members:view"], "any", {
    fallbackPath: "/unauthorized?reason=notebooks_access",
  });

  const resolvedParams = await Promise.resolve(params);

  // Validate UUID format before rendering
  if (!isValidUUID(resolvedParams.notebookId)) {
    redirect("/admin/community/planning/notebooks");
  }

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <Suspense fallback={<NotebookSkeleton />}>
        <NotebookContent notebookId={resolvedParams.notebookId} />
      </Suspense>
    </ProtectedPage>
  );
}
