import { z } from "zod";

import type { MetadataActionExecution, MetadataActionResult } from "../../types";
import { tenantUtils } from "@/utils/tenantUtils";
import { SupabaseAuditService } from "@/services/AuditService";
import type { RequestContext } from "@/lib/server/context";
import {
  createMembershipLookupRequestContext,
  mapMembershipLookupOption,
  resolveMembershipLookupDefinition,
} from "@/lib/metadata/services/admin-community/membershipLookups";

const inputSchema = z.object({
  lookupId: z.string().min(1, "Lookup context is required."),
  name: z.string().min(1, "Name is required."),
  code: z.string().min(1, "Code is required."),
});

type LookupContext = {
  service: {
    create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  fallbackLabel: string;
};

export async function handleMembershipLookupQuickCreate(
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
      message: "All fields are required to create a lookup option.",
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
    const lookupContext = createLookupContext(lookupId, context, auditService);

    if (!lookupContext) {
      return {
        success: false,
        status: 400,
        message: "This lookup cannot be created from the form.",
      } satisfies MetadataActionResult;
    }

    const record = await lookupContext.service.create({ name, code });
    const option = mapMembershipLookupOption(record, lookupContext.fallbackLabel) ?? {
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

    console.error("Failed to create lookup option", error);
    return {
      success: false,
      status: 500,
      message: "We couldn't save the new option. Please try again.",
    } satisfies MetadataActionResult;
  }
}

function createLookupContext(
  lookupId: string,
  context: RequestContext,
  auditService: SupabaseAuditService,
): LookupContext | null {
  const definition = resolveMembershipLookupDefinition(lookupId);
  if (!definition) {
    return null;
  }

  const service = definition.createService(context, auditService);
  return {
    service,
    fallbackLabel: definition.fallbackLabel,
  } satisfies LookupContext;
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
      message: getUniqueConstraintMessage(message, lookupId),
    } satisfies MetadataActionResult;
  }

  return null;
}

function extractErrorMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
    return (error as any).message;
  }

  return null;
}

function isUniqueConstraintError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("duplicate key value") && normalized.includes("unique constraint");
}

function getUniqueConstraintMessage(message: string, lookupId: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("membership_center")) {
    return "A center with this code already exists. Try a different code.";
  }

  if (normalized.includes("membership_stage")) {
    return "A membership stage with this code already exists.";
  }

  if (normalized.includes("membership_type")) {
    return "A membership type with this code already exists.";
  }

  switch (lookupId) {
    case "membership.center":
      return "This center code is already in use.";
    case "membership.stage":
      return "This membership stage code is already in use.";
    case "membership.type":
      return "This membership type code is already in use.";
    default:
      return "An item with this code already exists.";
  }
}
