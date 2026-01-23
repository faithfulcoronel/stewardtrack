import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { NotebookService } from "@/services/NotebookService";
import { getCurrentUserId, getCurrentTenantId } from "@/lib/server/context";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string; pageId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    const tenantId = await getCurrentTenantId();

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId } = await params;
    const body = await request.json();
    const { title, content } = body;

    const notebookService = container.get<NotebookService>(TYPES.NotebookService);

    const updatedData: any = {};
    if (title !== undefined) updatedData.title = title;
    if (content !== undefined) updatedData.content = content;

    const updatedPage = await notebookService.updatePage(pageId, updatedData);

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error("Error updating page:", error);
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string; pageId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    const tenantId = await getCurrentTenantId();

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId } = await params;

    const notebookService = container.get<NotebookService>(TYPES.NotebookService);
    await notebookService.deletePage(pageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
