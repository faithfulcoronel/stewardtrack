import { z } from "zod";

import type { MetadataActionExecution, MetadataActionResult } from "../../types";
import { tenantUtils } from "@/utils/tenantUtils";
import { SupabaseAuditService } from "@/services/AuditService";
import { MembershipStageAdapter } from "@/adapters/membershipStage.adapter";
import { MembershipStageRepository } from "@/repositories/membershipStage.repository";
import { MembershipStageService } from "@/services/MembershipStageService";
import { MembershipTypeAdapter } from "@/adapters/membershipType.adapter";
import { MembershipTypeRepository } from "@/repositories/membershipType.repository";
import { MembershipTypeService } from "@/services/MembershipTypeService";
import { MembershipCenterAdapter } from "@/adapters/membershipCenter.adapter";
import { MembershipCenterRepository } from "@/repositories/membershipCenter.repository";
import { MembershipCenterService } from "@/services/MembershipCenterService";
import type { BaseAdapter } from "@/adapters/base.adapter";
import type { RequestContext } from "@/lib/server/context";
import { formatLabel } from "@/lib/metadata/services/admin-community/membershipLookups";
import type { FormFieldOption } from "@/components/dynamic/admin/types";

const inputSchema = z.object({
  lookupId: z.string().min(1, "Lookup context is required."),
  name: z.string().min(1, "Name is required."),
  code: z.string().min(1, "Code is required."),
});

type LookupService = {
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

type LookupContext = {
  service: LookupService;
  mapOption: (record: Record<string, unknown>) => FormFieldOption | null;
};

export async function handleMembershipLookupQuickCreate(
  execution: MetadataActionExecution,
): Promise<MetadataActionResult> {
  const parsed = inputSchema.safeParse(execution.input);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request.";
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

    const context = createRequestContext(tenantId, execution.context.role ?? null);
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
    const option = lookupContext.mapOption(record) ?? {
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
  switch (lookupId) {
    case "membership.stage": {
      const service = createMembershipStageService(context, auditService);
      return {
        service,
        mapOption: (record) => mapOption(record, "Member stage"),
      };
    }
    case "membership.type": {
      const service = createMembershipTypeService(context, auditService);
      return {
        service,
        mapOption: (record) => mapOption(record, "Membership type"),
      };
    }
    case "membership.center": {
      const service = createMembershipCenterService(context, auditService);
      return {
        service,
        mapOption: (record) => mapOption(record, "Center"),
      };
    }
    default:
      return null;
  }
}

function mapOption(record: Record<string, unknown>, fallback: string): FormFieldOption | null {
  const id = typeof record.id === "string" ? record.id.trim() : null;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const code = typeof record.code === "string" ? record.code.trim() : "";

  if (!id && !code) {
    return null;
  }

  const value = id ?? code;
  return {
    value,
    label: name || formatLabel(code || value, fallback),
  };
}

function createRequestContext(tenantId: string, role: string | null): RequestContext {
  const context: RequestContext = {
    tenantId,
  };

  if (role) {
    context.roles = [role];
  }

  return context;
}

function applyRequestContext(adapter: BaseAdapter<any>, context: RequestContext) {
  (adapter as unknown as { context: RequestContext }).context = context;
}

function createMembershipStageService(
  context: RequestContext,
  auditService: SupabaseAuditService,
): LookupService {
  const adapter = new MembershipStageAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipStageRepository(adapter);
  return new MembershipStageService(repository);
}

function createMembershipTypeService(
  context: RequestContext,
  auditService: SupabaseAuditService,
): LookupService {
  const adapter = new MembershipTypeAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipTypeRepository(adapter);
  return new MembershipTypeService(repository);
}

function createMembershipCenterService(
  context: RequestContext,
  auditService: SupabaseAuditService,
): LookupService {
  const adapter = new MembershipCenterAdapter(auditService);
  applyRequestContext(adapter, context);
  const repository = new MembershipCenterRepository(adapter);
  return new MembershipCenterService(repository);
}
