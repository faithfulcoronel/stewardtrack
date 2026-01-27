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
 * SECURITY: Protected by AccessGate requiring notebooks:view permission.
 * @permission notebooks:view - Required to view notebook details
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
import type { NotebookWithSections } from "@/models/notebook.model";
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
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-muted/20">
      {/* Desktop Sidebar Skeleton */}
      <div className="hidden md:flex w-80 lg:w-96 border-r border-border/50 bg-card/50 backdrop-blur-sm flex-col">
        {/* Header Skeleton */}
        <div className="p-4 md:p-5 border-b border-border/50">
          <div className="flex items-start gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-full mt-4 rounded-lg" />
        </div>
        {/* Sections Skeleton */}
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <div className="ml-9 pl-4 border-l border-border/50 space-y-1">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Header Skeleton */}
      <div className="md:hidden border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Header Skeleton - Desktop */}
        <div className="hidden md:block border-b border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3.5 w-3.5" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-64" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
        {/* Editor Skeleton */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="h-full bg-card/50 rounded-xl border border-border/50 shadow-sm p-6 space-y-4">
            <div className="flex gap-2 border-b border-border/50 pb-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-8 w-8 rounded" />
              ))}
            </div>
            <div className="space-y-3 pt-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
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
  const notebook = await notebookService.getNotebookWithSections(notebookId) as NotebookWithSections | null;

  if (!notebook) {
    notFound();
  }

  // Permission checks
  const hasAny = (perms: string[]) => perms.some(p => userPermissions.includes(p));
  const canEdit = hasAny(["notebooks:manage"]);

  return <NotebookLayout notebook={notebook} canEdit={canEdit} />;
}

export default async function NotebookDetailPage({ params }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();

  // Page-level access gate - requires at least members:view permission
  const gate = Gate.withPermission(["notebooks:view"], "any", {
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
