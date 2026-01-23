import type { MetadataActionHandler, MetadataActionExecution, MetadataActionResult } from "../types";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { TenantService } from "@/services/TenantService";
import type { NotebookService } from "@/services/NotebookService";

/**
 * Normalizes the action payload to extract form values.
 * The AdminFormSubmitHandler wraps form values in a { mode, values } structure.
 */
function normalizeFormPayload(input: unknown): {
  mode: string | null;
  values: Record<string, unknown>;
} {
  if (!input || typeof input !== "object") {
    return { mode: null, values: {} };
  }

  const payload = input as Record<string, unknown>;
  const mode = typeof payload.mode === "string" ? payload.mode : null;
  const values =
    payload.values && typeof payload.values === "object" && !Array.isArray(payload.values)
      ? (payload.values as Record<string, unknown>)
      : {};

  return { mode, values };
}

/**
 * Action handler for creating/updating notebooks
 */
const handleNotebookSave: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const { values: formData } = normalizeFormPayload(execution.input);
    if (!formData || Object.keys(formData).length === 0) {
      return { success: false, message: "No form data provided" };
    }

    const notebookId = execution.context.params?.notebookId as string | undefined;
    const isEditMode = !!notebookId;

    const notebookService = container.get<NotebookService>(TYPES.NotebookService);

    // Parse tags - handle both string and array formats
    let tags: string[] = [];
    const rawTags = formData.tags;
    if (Array.isArray(rawTags)) {
      tags = rawTags.map((t) => String(t).trim()).filter((t) => t.length > 0);
    } else if (typeof rawTags === "string" && rawTags.length > 0) {
      tags = rawTags.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    }

    const notebookData = {
      title: formData.title as string,
      description: (formData.description as string) || undefined,
      visibility: (formData.visibility as 'private' | 'shared' | 'tenant') || 'private',
      color: (formData.color as string) || "#4F46E5",
      icon: (formData.icon as string) || "book",
      tags,
    };

    if (isEditMode) {
      await notebookService.updateNotebook(notebookId, notebookData);
      return {
        success: true,
        data: { notebookId },
        message: "Notebook updated successfully",
        redirectUrl: "/admin/community/planning/notebooks",
      };
    } else {
      const newNotebook = await notebookService.createNotebook(notebookData);
      return {
        success: true,
        data: { notebookId: newNotebook.id },
        message: "Notebook created successfully",
        redirectUrl: "/admin/community/planning/notebooks",
      };
    }
  } catch (error) {
    console.error("[notebooks action] Notebook save failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save notebook",
    };
  }
};

/**
 * Action handler for deleting notebooks
 */
const handleNotebookDelete: MetadataActionHandler = async (
  execution: MetadataActionExecution
): Promise<MetadataActionResult> => {
  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return { success: false, message: "No tenant context available" };
    }

    const notebookId = execution.context.params?.notebookId as string;
    if (!notebookId) {
      return { success: false, message: "Notebook ID is required" };
    }

    const notebookService = container.get<NotebookService>(TYPES.NotebookService);
    await notebookService.deleteNotebook(notebookId);

    return {
      success: true,
      message: "Notebook deleted successfully",
    };
  } catch (error) {
    console.error("[notebooks action] Notebook delete failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete notebook",
    };
  }
};

export const notebooksActionHandlers: Record<string, MetadataActionHandler> = {
  "admin-community.planning.notebooks.save": handleNotebookSave,
  "admin-community.planning.notebooks.delete": handleNotebookDelete,
};
