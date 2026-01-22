/**
 * ManageCarePlanTool
 * Manages care plan operations using GraphQL mutations
 *
 * Features:
 * - Create new care plan for a member
 * - Update existing care plan details
 * - Close care plan when completed
 * - Reopen closed care plan
 * - Delete care plan (soft delete)
 * - Uses GraphQL mutations with cache invalidation
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, CarePlanMutations } from '@/lib/graphql/client';

export interface ManageCarePlanInput {
  operation: 'create' | 'update' | 'close' | 'reopen' | 'delete';
  care_plan_id?: string;
  member_id?: string;
  status_code?: string;
  status_label?: string;
  priority?: string;
  assigned_to_member_id?: string;
  follow_up_at?: string;
  details?: string;
  membership_stage_id?: string;
  is_active?: boolean;
}

export class ManageCarePlanTool extends BaseTool {
  readonly name = 'manage_care_plan';
  readonly description =
    'Manages care plan operations: create new care plan, update care plan details, close care plan, reopen care plan, or delete care plan. ' +
    'Use this when the user wants to create pastoral care plans for members, update care information, mark care plans as complete, or manage care plan lifecycle.';

  getCategory(): string {
    return 'Care Plan Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Create a care plan for John Smith for hospital visit',
      'Update this care plan with new follow-up date',
      'Close this care plan as completed',
      'Reopen the care plan for Mary Johnson',
      'Delete this care plan',
      'Create an urgent care plan for member needing prayer',
      'Assign this care plan to Pastor Sarah',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        operation: {
          type: 'string',
          enum: ['create', 'update', 'close', 'reopen', 'delete'],
          description: 'The operation to perform: create (new care plan), update (modify care plan), close (mark as completed), reopen (reactivate closed plan), delete (remove care plan)',
        },
        care_plan_id: {
          type: 'string',
          description: 'The unique ID of the care plan (required for update, close, reopen, delete operations)',
        },
        member_id: {
          type: 'string',
          description: 'The unique ID of the member (required for create operation)',
        },
        status_code: {
          type: 'string',
          description: 'Status code for the care plan (e.g., "active", "pending", "completed") (required for create, optional for update)',
        },
        status_label: {
          type: 'string',
          description: 'Human-readable status label (optional, used with create or update)',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          description: 'Priority level of the care plan (optional, used with create or update)',
        },
        assigned_to_member_id: {
          type: 'string',
          description: 'The unique ID of the member (staff/pastor) assigned as caregiver (optional, used with create or update)',
        },
        follow_up_at: {
          type: 'string',
          description: 'ISO 8601 date-time for follow-up visit (e.g., "2026-01-25T10:00:00Z") (optional, used with create or update)',
        },
        details: {
          type: 'string',
          description: 'Detailed care notes, prayer requests, or pastoral care information (optional, used with create or update)',
        },
        membership_stage_id: {
          type: 'string',
          description: 'Associated membership stage ID (optional, used with create or update)',
        },
        is_active: {
          type: 'boolean',
          description: 'Whether the care plan is active (optional, used with create or update)',
        },
      },
      required: ['operation'],
    };
  }

  async execute(input: ManageCarePlanInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[ManageCarePlanTool] Operation: ${input.operation}, carePlanId=${input.care_plan_id}, memberId=${input.member_id}`);

      let result: any;
      let message: string;

      switch (input.operation) {
        case 'create':
          if (!input.member_id || !input.status_code) {
            return this.error('member_id and status_code are required when creating a care plan');
          }

          result = await graphqlQuery<{ createCarePlan: any }>(CarePlanMutations.CREATE_CARE_PLAN, {
            input: {
              member_id: input.member_id,
              status_code: input.status_code,
              status_label: input.status_label,
              priority: input.priority,
              assigned_to_member_id: input.assigned_to_member_id,
              follow_up_at: input.follow_up_at,
              details: input.details,
              membership_stage_id: input.membership_stage_id,
              is_active: input.is_active,
            },
          });

          message = `Created care plan for ${result.createCarePlan.member.first_name} ${result.createCarePlan.member.last_name}`;

          if (input.priority === 'urgent' || input.priority === 'high') {
            message += ` with ${input.priority} priority`;
          }

          if (input.assigned_to_member_id && result.createCarePlan.assigned_to_member) {
            message += `, assigned to ${result.createCarePlan.assigned_to_member.first_name} ${result.createCarePlan.assigned_to_member.last_name}`;
          }

          console.log(`[ManageCarePlanTool] ${message}`);

          return this.success({
            operation: 'create',
            care_plan: {
              id: result.createCarePlan.id,
              member_id: result.createCarePlan.member_id,
              member_name: `${result.createCarePlan.member.first_name} ${result.createCarePlan.member.last_name}`,
              status_code: result.createCarePlan.status_code,
              status_label: result.createCarePlan.status_label || null,
              priority: result.createCarePlan.priority || null,
              assigned_to: result.createCarePlan.assigned_to_member ? {
                id: result.createCarePlan.assigned_to_member.id,
                name: `${result.createCarePlan.assigned_to_member.first_name} ${result.createCarePlan.assigned_to_member.last_name}`,
              } : null,
              follow_up_at: result.createCarePlan.follow_up_at || null,
              details: result.createCarePlan.details || null,
              created_at: result.createCarePlan.created_at,
            },
            message,
          });

        case 'update':
          if (!input.care_plan_id) {
            return this.error('care_plan_id is required when updating a care plan');
          }

          result = await graphqlQuery<{ updateCarePlan: any }>(CarePlanMutations.UPDATE_CARE_PLAN, {
            id: input.care_plan_id,
            input: {
              status_code: input.status_code,
              status_label: input.status_label,
              priority: input.priority,
              assigned_to_member_id: input.assigned_to_member_id,
              follow_up_at: input.follow_up_at,
              details: input.details,
              membership_stage_id: input.membership_stage_id,
              is_active: input.is_active,
            },
          });

          message = `Updated care plan`;
          console.log(`[ManageCarePlanTool] ${message}`);

          return this.success({
            operation: 'update',
            care_plan: {
              id: result.updateCarePlan.id,
              status_code: result.updateCarePlan.status_code,
              status_label: result.updateCarePlan.status_label || null,
              priority: result.updateCarePlan.priority || null,
              assigned_to: result.updateCarePlan.assigned_to_member ? {
                id: result.updateCarePlan.assigned_to_member.id,
                name: `${result.updateCarePlan.assigned_to_member.first_name} ${result.updateCarePlan.assigned_to_member.last_name}`,
              } : null,
              follow_up_at: result.updateCarePlan.follow_up_at || null,
              updated_at: result.updateCarePlan.updated_at,
            },
            message,
          });

        case 'close':
          if (!input.care_plan_id) {
            return this.error('care_plan_id is required when closing a care plan');
          }

          result = await graphqlQuery<{ closeCarePlan: any }>(CarePlanMutations.CLOSE_CARE_PLAN, {
            id: input.care_plan_id,
          });

          message = `Closed care plan`;
          console.log(`[ManageCarePlanTool] ${message}`);

          return this.success({
            operation: 'close',
            care_plan: {
              id: result.closeCarePlan.id,
              status_code: result.closeCarePlan.status_code,
              status_label: result.closeCarePlan.status_label || null,
              closed_at: result.closeCarePlan.closed_at,
              is_active: result.closeCarePlan.is_active,
              updated_at: result.closeCarePlan.updated_at,
            },
            message,
          });

        case 'reopen':
          if (!input.care_plan_id) {
            return this.error('care_plan_id is required when reopening a care plan');
          }

          result = await graphqlQuery<{ reopenCarePlan: any }>(CarePlanMutations.REOPEN_CARE_PLAN, {
            id: input.care_plan_id,
          });

          message = `Reopened care plan`;
          console.log(`[ManageCarePlanTool] ${message}`);

          return this.success({
            operation: 'reopen',
            care_plan: {
              id: result.reopenCarePlan.id,
              status_code: result.reopenCarePlan.status_code,
              status_label: result.reopenCarePlan.status_label || null,
              closed_at: result.reopenCarePlan.closed_at,
              is_active: result.reopenCarePlan.is_active,
              updated_at: result.reopenCarePlan.updated_at,
            },
            message,
          });

        case 'delete':
          if (!input.care_plan_id) {
            return this.error('care_plan_id is required when deleting a care plan');
          }

          result = await graphqlQuery<{ deleteCarePlan: boolean }>(CarePlanMutations.DELETE_CARE_PLAN, {
            id: input.care_plan_id,
          });

          message = `Deleted care plan`;
          console.log(`[ManageCarePlanTool] ${message}`);

          return this.success({
            operation: 'delete',
            success: result.deleteCarePlan,
            message,
          });

        default:
          return this.error(`Unknown operation: ${input.operation}`);
      }
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to ${input.operation} care plan: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: ManageCarePlanInput): string {
    switch (input.operation) {
      case 'create':
        return `Creating care plan...`;
      case 'update':
        return `Updating care plan...`;
      case 'close':
        return `Closing care plan...`;
      case 'reopen':
        return `Reopening care plan...`;
      case 'delete':
        return `Deleting care plan...`;
      default:
        return `Managing care plan...`;
    }
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
MANAGE CARE PLAN TOOL - Usage Instructions:

**When to Use:**
- User wants to create a new care plan for a member
- User wants to update care plan information (status, priority, notes)
- User wants to close a completed care plan
- User wants to reopen a previously closed care plan
- User wants to delete a care plan

**Operations:**

1. **create**: Create a new care plan for a member
   - Required: member_id, status_code
   - Optional: status_label, priority, assigned_to_member_id, follow_up_at, details, membership_stage_id, is_active
   - Priority levels: low, normal, high, urgent
   - Always create care plans with clear details about the pastoral need

2. **update**: Modify an existing care plan
   - Required: care_plan_id
   - Optional: All other fields can be updated
   - Use to reassign caregivers, update follow-up dates, modify notes, change priority

3. **close**: Mark care plan as completed
   - Required: care_plan_id
   - Sets closed_at timestamp and marks as inactive
   - Use when pastoral care is completed or no longer needed

4. **reopen**: Reactivate a closed care plan
   - Required: care_plan_id
   - Clears closed_at timestamp and marks as active
   - Use when care needs resume or follow-up is required

5. **delete**: Remove care plan (soft delete)
   - Required: care_plan_id
   - Soft deletion - preserves historical record
   - ALWAYS get user confirmation before deleting

**Usage Tips:**
- Always confirm member identity before creating care plans
- Include detailed notes about pastoral needs in the details field
- Set appropriate priority levels (urgent for crisis situations)
- Assign caregivers (pastor/staff) when creating or updating
- Set follow-up dates for scheduled visits
- Close care plans when pastoral care is completed
- Get confirmation before deleting care plans

**Example Workflows:**

User: "Create a care plan for John Smith for hospital visit"
Assistant:
1. Use search_members to find John Smith's ID
2. Call manage_care_plan with operation="create", status_code="active", details="Hospital visit needed", priority="high"
3. Respond: "I've created a high-priority care plan for John Smith for his hospital visit. Would you like to assign a caregiver or set a follow-up date?"

User: "Assign this care plan to Pastor Sarah"
Assistant:
1. Use search_members to find Pastor Sarah's ID
2. Call manage_care_plan with operation="update", care_plan_id, assigned_to_member_id
3. Respond: "I've assigned this care plan to Pastor Sarah. She can coordinate the pastoral visit."

User: "Mark this care plan as completed"
Assistant:
1. Call manage_care_plan with operation="close", care_plan_id
2. Respond: "I've closed this care plan and marked it as completed."

User: "Update the follow-up date to next Tuesday"
Assistant:
1. Convert "next Tuesday" to ISO 8601 format
2. Call manage_care_plan with operation="update", care_plan_id, follow_up_at
3. Respond: "I've updated the follow-up date to Tuesday, January 28, 2026."

User: "Delete this care plan"
Assistant:
1. Confirm with user first: "Are you sure you want to delete this care plan? This action cannot be undone."
2. If confirmed, call manage_care_plan with operation="delete", care_plan_id
3. Respond: "I've deleted the care plan."

**Important Notes:**
- ALWAYS get user confirmation before deleting care plans
- Set priority appropriately: urgent for crisis, high for immediate needs
- Include detailed pastoral care notes in the details field
- Assign caregivers when possible for accountability
- Set realistic follow-up dates
- Close care plans when pastoral care is completed (don't leave them open indefinitely)
- Use reopen if care needs resume after closing
    `.trim();
  }
}
