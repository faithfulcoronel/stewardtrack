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
    const { title, description } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const notebookService = container.get<NotebookService>(TYPES.NotebookService);

    // Get current sections to determine sort order
    const notebook = await notebookService.getNotebookWithSections(notebookId);
    const maxSortOrder = notebook?.sections?.reduce((max, s) => Math.max(max, s.sort_order), 0) || 0;

    const newSection = await notebookService.createSection({
      notebook_id: notebookId,
      title,
      description: description || null,
      sort_order: maxSortOrder + 1,
    });

    return NextResponse.json(newSection, { status: 201 });
  } catch (error) {
    console.error("Error creating section:", error);
    return NextResponse.json(
      { error: "Failed to create section" },
      { status: 500 }
    );
  }
}
