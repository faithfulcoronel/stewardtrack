import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { NotebookService } from "@/services/NotebookService";
import { getCurrentUserId, getCurrentTenantId } from "@/lib/server/context";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    const tenantId = await getCurrentTenantId();

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notebookId } = await params;
    const body = await request.json();
    const { sectionId, title } = body;

    if (!title || !sectionId) {
      return NextResponse.json(
        { error: "Title and sectionId are required" },
        { status: 400 }
      );
    }

    const notebookService = container.get<NotebookService>(TYPES.NotebookService);

    // Get current section pages to determine sort order
    const existingPages = await notebookService.getPagesBySection(sectionId);
    const maxSortOrder = existingPages.reduce((max, p) => Math.max(max, p.sort_order), 0);

    const newPage = await notebookService.createPage({
      notebook_id: notebookId,
      section_id: sectionId,
      title,
      content: null,
      sort_order: maxSortOrder + 1,
    });

    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    console.error("Error creating page:", error);
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 }
    );
  }
}
