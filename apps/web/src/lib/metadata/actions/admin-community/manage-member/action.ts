import type { MetadataActionExecution, MetadataActionResult } from "../../types";
import { tenantUtils } from "@/utils/tenantUtils";

import type { Member } from "@/models/member.model";

import { ManageMemberRequestParser } from "./request";
import { MemberManageResourceFactory } from "./resourceFactory";
import { MemberFormMapper } from "./mapper";
import { ManageMemberResultBuilder } from "./result";
import { FieldValidationError, handleError } from "@/utils/errorHandler";

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
      const baseError = handleError(error, {
        context: "manage-member.persist",
        memberId: request.memberId ?? null,
        mode: request.mode ?? null,
      });

      if (baseError instanceof FieldValidationError) {
        return {
          success: false,
          status: 400,
          message: baseError.message,
          errors: {
            fieldErrors: {
              [baseError.field]: baseError.messages,
            },
          },
        } satisfies MetadataActionResult;
      }

      // Parse database constraint errors to provide meaningful messages
      const errorMessage = baseError.message?.trim() || '';
      let userMessage = "Something went wrong while saving the member. Please try again.";

      if (errorMessage.includes('null value in column') && errorMessage.includes('violates not-null constraint')) {
        const columnMatch = errorMessage.match(/column "([^"]+)"/);
        const columnName = columnMatch ? columnMatch[1] : 'a required field';
        userMessage = `The ${columnName} field is required but was not provided. Please ensure all required fields are filled in.`;
      } else if (errorMessage.includes('duplicate key value violates unique constraint')) {
        userMessage = "A member with this information already exists. Please check for duplicates.";
      } else if (errorMessage.includes('violates foreign key constraint')) {
        userMessage = "The selected option is no longer valid. Please refresh the page and try again.";
      } else if (errorMessage) {
        // Use the actual error message if it's meaningful (not too technical)
        if (!errorMessage.includes('SupabaseClient') && !errorMessage.includes('undefined') && errorMessage.length < 200) {
          userMessage = errorMessage;
        }
      }

      return {
        success: false,
        status: 500,
        message: userMessage,
        errors: {
          formErrors: [userMessage],
        },
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
