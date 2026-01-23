import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { NotebookService } from "@/services/NotebookService";
import { getCurrentUserId, getCurrentTenantId } from "@/lib/server/context";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string; sectionId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    const tenantId = await getCurrentTenantId();

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId } = await params;
    const body = await request.json();
    const { title, description } = body;

    const notebookService = container.get<NotebookService>(TYPES.NotebookService);

    const updatedData: any = {};
    if (title !== undefined) updatedData.title = title;
    if (description !== undefined) updatedData.description = description;

    const updatedSection = await notebookService.updateSection(sectionId, updatedData);

    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json(
      { error: "Failed to update section" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string; sectionId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    const tenantId = await getCurrentTenantId();

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId } = await params;

    const notebookService = container.get<NotebookService>(TYPES.NotebookService);
    await notebookService.deleteSection(sectionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json(
      { error: "Failed to delete section" },
      { status: 500 }
    );
  }
}
