import type { MetadataActionExecution, MetadataActionResult } from "../../types";
import { tenantUtils } from "@/utils/tenantUtils";

import type { Member } from "@/models/member.model";

import { ManageMemberRequestParser } from "./request";
import { MemberManageResourceFactory } from "./resourceFactory";
import { MemberFormMapper } from "./mapper";
import { ManageMemberResultBuilder } from "./result";

export class ManageMemberAction {
  constructor(
    private readonly requestParser = new ManageMemberRequestParser(),
    private readonly resourceFactory = new MemberManageResourceFactory(),
    private readonly mapper = new MemberFormMapper(),
    private readonly resultBuilder = new ManageMemberResultBuilder(),
  ) {}

  async execute(execution: MetadataActionExecution): Promise<MetadataActionResult> {
    const parseResult = this.requestParser.parse(execution.input);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const request = parseResult.data;

    try {
      const tenantId = await tenantUtils.getTenantId();
      if (!tenantId) {
        return {
          success: false,
          status: 403,
          message: "Tenant context was not found.",
        } satisfies MetadataActionResult;
      }

      const resources = await this.resourceFactory.build(tenantId, execution.context.role ?? null);

      const mappingResult = this.mapper.map(request, resources);
      if (!mappingResult.success) {
        return mappingResult.error;
      }

      const memberPayload = mappingResult.data.payload;

      let record: Member;
      if (request.memberId) {
        record = await resources.memberService.update(request.memberId, memberPayload);
      } else {
        record = await resources.memberService.create(memberPayload);
      }

      const targetId = record.id ?? request.memberId ?? null;
      const result = this.resultBuilder.build(execution.config, request.mode ?? null, targetId);

      return {
        success: true,
        status: 200,
        ...result,
        data: {
          memberId: targetId,
        },
      } satisfies MetadataActionResult;
    } catch (error) {
      console.error("Failed to persist membership changes", error);
      return {
        success: false,
        status: 500,
        message: "Something went wrong while saving the member. Please try again.",
      } satisfies MetadataActionResult;
    }
  }
}

const manageMemberAction = new ManageMemberAction();

export async function handleMemberManageExecution(
  execution: MetadataActionExecution,
): Promise<MetadataActionResult> {
  return manageMemberAction.execute(execution);
}
