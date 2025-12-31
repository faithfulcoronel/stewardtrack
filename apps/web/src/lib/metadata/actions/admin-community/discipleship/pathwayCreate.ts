/**
 * ================================================================================
 * DISCIPLESHIP PATHWAY QUICK-CREATE ACTION HANDLER
 * ================================================================================
 *
 * Handles the quick-create action for adding new discipleship pathways
 * from the AdminLookupQuickCreate component in the discipleship plan form.
 *
 * Follows the same pattern as handleMembershipLookupQuickCreate for consistency.
 *
 * ================================================================================
 */

import { z } from "zod";
import type { MetadataActionExecution, MetadataActionResult } from "../../types";
import { tenantUtils } from "@/utils/tenantUtils";
import { SupabaseAuditService } from "@/services/AuditService";
import {
  createMembershipLookupRequestContext,
  resolveMembershipLookupDefinition,
  mapMembershipLookupOption,
} from "@/lib/metadata/services/admin-community/membershipLookups";

const inputSchema = z.object({
  lookupId: z.string().min(1, "Lookup context is required."),
  name: z.string().min(1, "Name is required."),
  code: z.string().min(1, "Code is required."),
});

export async function handleDiscipleshipPathwayQuickCreate(
  execution: MetadataActionExecution,
): Promise<MetadataActionResult> {
  const parsed = inputSchema.safeParse(execution.input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request.";
    return {
      success: false,
      status: 400,
      message,
    } satisfies MetadataActionResult;
  }

  const payload = parsed.data;
  const lookupId = payload.lookupId.trim();
  const name = payload.name.trim();
  const code = payload.code.trim();

  if (!lookupId || !name || !code) {
    return {
      success: false,
      status: 400,
      message: "All fields are required to create a pathway.",
    } satisfies MetadataActionResult;
  }

  // Validate code format (lowercase with underscores/hyphens)
  const codePattern = /^[a-z][a-z0-9_-]*$/;
  if (!codePattern.test(code)) {
    return {
      success: false,
      status: 400,
      message: "Code must start with a letter and contain only lowercase letters, numbers, underscores, and hyphens.",
    } satisfies MetadataActionResult;
  }

  try {
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return {
        success: false,
        status: 403,
        message: "Tenant context was not found.",
      } satisfies MetadataActionResult;
    }

    const context = createMembershipLookupRequestContext(tenantId, execution.context.role ?? null);
    const auditService = new SupabaseAuditService();

    const definition = resolveMembershipLookupDefinition(lookupId);
    if (!definition) {
      return {
        success: false,
        status: 400,
        message: "This lookup cannot be created from the form.",
      } satisfies MetadataActionResult;
    }

    const service = definition.createService(context, auditService);
    const record = await service.create({ name, code });
    const option = mapMembershipLookupOption(record, definition.fallbackLabel) ?? {
      label: name,
      value: code,
    };

    if (!option.value) {
      return {
        success: false,
        status: 422,
        message: "The lookup option did not return a valid identifier.",
      } satisfies MetadataActionResult;
    }

    return {
      success: true,
      status: 200,
      data: {
        option,
      },
    } satisfies MetadataActionResult;
  } catch (error) {
    const handled = handleKnownLookupErrors(error, lookupId);
    if (handled) {
      return handled;
    }

    console.error("Failed to create discipleship pathway", error);
    return {
      success: false,
      status: 500,
      message: "We couldn't save the new pathway. Please try again.",
    } satisfies MetadataActionResult;
  }
}

function handleKnownLookupErrors(
  error: unknown,
  lookupId: string,
): MetadataActionResult | null {
  const message = extractErrorMessage(error);

  if (!message) {
    return null;
  }

  if (isUniqueConstraintError(message)) {
    return {
      success: false,
      status: 409,
      message: lookupId === 'discipleship_pathway'
        ? "A pathway with this code already exists."
        : "An item with this code already exists.",
    } satisfies MetadataActionResult;
  }

  return null;
}

function extractErrorMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return null;
}

function isUniqueConstraintError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("duplicate key value") && normalized.includes("unique constraint");
}
