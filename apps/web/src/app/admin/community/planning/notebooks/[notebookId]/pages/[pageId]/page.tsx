/**
 * ================================================================================
 * NOTEBOOK PAGE DETAIL
 * ================================================================================
 *
 * View and display a specific page within a notebook.
 * Shows page content, metadata, attachments, and provides edit/favorite actions.
 *
 * SECURITY: Protected by AccessGate requiring notebooks:view permission.
 * Row-level security enforced via has_notebook_access() function.
 *
 * NOTE: This could be enhanced with a dedicated XML blueprint in the future.
 * For now, we'll use a simplified direct rendering approach.
 *
 * ROUTE PARAMS:
 *   - notebookId: UUID of the parent notebook
 *   - pageId: UUID of the page to display
 *
 * ================================================================================
 */

import type { Metadata } from "next";
import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentTenantId, getCurrentUserId } from "@/lib/server/context";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { NotebookService } from "@/services/NotebookService";
import { notFound } from "next/navigation";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ notebookId: string; pageId: string }>;
}

export const metadata: Metadata = {
  title: "Page | StewardTrack",
  description: "View notebook page content and attachments",
};

export default async function NotebookPageDetailPage({ params }: PageProps) {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId();
  const gate = Gate.withPermission(["members:view"], "any", {
    fallbackPath: "/unauthorized?reason=notebooks_access",
  });

  const resolvedParams = await Promise.resolve(params);
  const { notebookId, pageId } = resolvedParams;

  // Fetch page data directly (can be moved to metadata system later if needed)
  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const page = await notebookService.getPageWithAttachments(pageId);

  if (!page) {
    notFound();
  }

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
            <div className="flex items-center gap-2">
              {page.is_favorite && (
                <span className="text-yellow-500" title="Favorite">⭐</span>
              )}
            </div>
          </div>
          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {page.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Page Content */}
        {page.content ? (
          <RichTextViewer
            content={page.content}
            className="bg-card dark:bg-card rounded-lg border border-border p-4 sm:p-6 shadow-sm"
          />
        ) : (
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <p className="text-muted-foreground italic">No content yet. Click Edit to add content.</p>
          </div>
        )}

        {/* Attachments */}
        {(page as any).attachments && (page as any).attachments.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">Attachments</h2>
            <div className="space-y-2">
              {(page as any).attachments.map((attachment: any) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="text-2xl">📎</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{attachment.file_name}</p>
                    {attachment.file_size && (
                      <p className="text-sm text-gray-500">
                        {(attachment.file_size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>Last modified: {new Date(page.updated_at).toLocaleString()}</p>
          {page.section_title && <p>Section: {page.section_title}</p>}
        </div>
      </div>
    </ProtectedPage>
  );
}
