import type { MetadataActionExecution, MetadataActionResult } from "../../types";
import { tenantUtils } from "@/utils/tenantUtils";

import type { Member } from "@/models/member.model";
import type { FamilyRole } from "@/models/familyMember.model";

import { ManageMemberRequestParser } from "./request";
import { MemberManageResourceFactory } from "./resourceFactory";
import { MemberFormMapper, type FamilyMembershipInput } from "./mapper";
import { ManageMemberResultBuilder } from "./result";
import { FieldValidationError, handleError } from "@/utils/errorHandler";
import type { FamilyService } from "@/services/FamilyService";

export class ManageMemberAction {
  constructor(
    private readonly requestParser = new ManageMemberRequestParser(),
    private readonly resourceFactory = new MemberManageResourceFactory(),
    private readonly mapper = new MemberFormMapper(),
    private readonly resultBuilder = new ManageMemberResultBuilder(),
  ) {}

  /**
   * Sync family memberships for a member
   * Uses the FamilyService to add/remove/update family memberships
   */
  private async syncFamilyMemberships(
    familyService: FamilyService,
    memberId: string,
    tenantId: string,
    memberships: FamilyMembershipInput[]
  ): Promise<void> {
    console.log('[ManageMemberAction] Syncing family memberships for member:', memberId);
    console.log('[ManageMemberAction] New memberships:', memberships);

    try {
      // Get current family memberships
      const currentMemberships = await familyService.getMemberFamilies(memberId, tenantId);
      const currentFamilyIds = new Set(currentMemberships.map(m => m.family_id));
      const newFamilyIds = new Set(memberships.map(m => m.familyId));

      // Remove memberships that are no longer in the list
      for (const current of currentMemberships) {
        if (!newFamilyIds.has(current.family_id)) {
          console.log('[ManageMemberAction] Removing family membership:', current.family_id);
          await familyService.removeMemberFromFamily(current.family_id, memberId, tenantId);
        }
      }

      // Add or update memberships
      for (const membership of memberships) {
        if (!membership.familyId) continue;

        if (currentFamilyIds.has(membership.familyId)) {
          // Update existing membership
          console.log('[ManageMemberAction] Updating family membership:', membership.familyId);
          await familyService.updateMemberRole(
            membership.familyId,
            memberId,
            tenantId,
            membership.role as FamilyRole
          );
          // Update primary status if needed
          if (membership.isPrimary) {
            await familyService.setPrimaryFamily(memberId, membership.familyId, tenantId);
          }
        } else {
          // Add new membership
          console.log('[ManageMemberAction] Adding family membership:', membership.familyId);
          await familyService.addMemberToFamily(
            membership.familyId,
            memberId,
            tenantId,
            {
              isPrimary: membership.isPrimary,
              role: membership.role as FamilyRole,
            }
          );
        }
      }

      console.log('[ManageMemberAction] Family memberships synced successfully');
    } catch (error) {
      console.error('[ManageMemberAction] Failed to sync family memberships:', error);
      // Don't throw - family sync failure shouldn't block member save
      // The member data has already been saved successfully
    }
  }

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
      const familyMemberships = mappingResult.data.familyMemberships;

      let record: Member;
      if (request.memberId) {
        record = await resources.memberService.update(request.memberId, memberPayload);
      } else {
        record = await resources.memberService.create(memberPayload);
      }

      const targetId = record.id ?? request.memberId ?? null;

      // Sync family memberships if provided
      console.log('[ManageMemberAction] Checking if we should sync family memberships');
      console.log('[ManageMemberAction] targetId:', targetId);
      console.log('[ManageMemberAction] familyMemberships:', familyMemberships);
      console.log('[ManageMemberAction] familyMemberships !== undefined:', familyMemberships !== undefined);
      if (targetId && familyMemberships !== undefined) {
        console.log('[ManageMemberAction] Calling syncFamilyMemberships');
        await this.syncFamilyMemberships(
          resources.familyService,
          targetId,
          tenantId,
          familyMemberships
        );
      } else {
        console.log('[ManageMemberAction] Skipping syncFamilyMemberships - condition not met');
      }

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
