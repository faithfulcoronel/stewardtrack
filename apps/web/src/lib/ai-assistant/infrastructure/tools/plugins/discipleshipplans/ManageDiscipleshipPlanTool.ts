/**
 * ManageDiscipleshipPlanTool
 * Manages discipleship plan operations using GraphQL mutations
 *
 * Features:
 * - Create new discipleship plan for a member
 * - Update existing plan details (mentor, notes, target date)
 * - Complete plan when journey is finished
 * - Archive inactive plans
 * - Delete plan (soft delete)
 * - Celebrate milestone achievements
 * - Uncelebrate milestones if needed
 * - Uses GraphQL mutations with cache invalidation
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, DiscipleshipPlanMutations } from '@/lib/graphql/client';

export interface ManageDiscipleshipPlanInput {
  operation: 'create' | 'update' | 'complete' | 'archive' | 'delete' | 'celebrate_milestone' | 'uncelebrate_milestone';
  plan_id?: string;
  member_id?: string;
  pathway_id?: string;
  mentor_name?: string;
  start_date?: string;
  target_date?: string;
  notes?: string;
  milestone_id?: string;
}

export class ManageDiscipleshipPlanTool extends BaseTool {
  readonly name = 'manage_discipleship_plan';
  readonly description =
    'Manages discipleship plan operations: create new plan, update plan details, complete plan, archive plan, delete plan, celebrate milestone, or uncelebrate milestone. ' +
    'Use this when the user wants to create spiritual growth journeys for members, update journey information, mark journeys as complete, celebrate milestone achievements, or manage plan lifecycle.';

  getCategory(): string {
    return 'Discipleship Plan Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Create a discipleship plan for John Smith on Growth Track',
      'Update this plan with a new mentor',
      'Complete this discipleship journey',
      'Celebrate this milestone achievement',
      'Archive this discipleship plan',
      'Delete this plan',
      'Assign Pastor Sarah as mentor for this journey',
      'Set target completion date for this plan',
    ];
  }

  /**
   * Required permission for managing discipleship plans
   *
   * NOTE: Permission enforcement is handled by PermissionGate at the
   * executor level (PluginAwareAgenticExecutor) - the single source of truth.
   * This method only DECLARES the required permissions.
   */
  protected getRequiredPermissions(): string[] {
    return ['discipleshipplans:manage'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        operation: {
          type: 'string',
          enum: ['create', 'update', 'complete', 'archive', 'delete', 'celebrate_milestone', 'uncelebrate_milestone'],
          description: 'The operation to perform: create (new plan), update (modify plan), complete (mark as finished), archive (mark as inactive), delete (remove plan), celebrate_milestone (mark milestone as celebrated), uncelebrate_milestone (remove celebration)',
        },
        plan_id: {
          type: 'string',
          description: 'The unique ID of the discipleship plan (required for update, complete, archive, delete, celebrate_milestone, uncelebrate_milestone operations)',
        },
        member_id: {
          type: 'string',
          description: 'The unique ID of the member (required for create operation)',
        },
        pathway_id: {
          type: 'string',
          description: 'The unique ID or name of the pathway (e.g., "Growth Track", "Leadership Development") (required for create, optional for update)',
        },
        mentor_name: {
          type: 'string',
          description: 'The name of the mentor (pastor/staff) assigned (optional, used with create or update)',
        },
        start_date: {
          type: 'string',
          description: 'ISO 8601 date for journey start (e.g., "2026-01-22") (required for create)',
        },
        target_date: {
          type: 'string',
          description: 'ISO 8601 date for target completion (e.g., "2026-03-15") (optional, used with create or update)',
        },
        notes: {
          type: 'string',
          description: 'Detailed journey notes or spiritual growth observations (optional, used with create or update)',
        },
        milestone_id: {
          type: 'string',
          description: 'The unique ID of the milestone to celebrate or uncelebrate (required for celebrate_milestone and uncelebrate_milestone)',
        },
      },
      required: ['operation'],
    };
  }

  async execute(input: ManageDiscipleshipPlanInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[ManageDiscipleshipPlanTool] Operation: ${input.operation}, planId=${input.plan_id}, memberId=${input.member_id}`);

      let result: any;
      let message: string;

      switch (input.operation) {
        case 'create':
          if (!input.member_id || !input.pathway_id || !input.start_date) {
            return this.error('member_id, pathway_id, and start_date are required when creating a discipleship plan');
          }

          result = await graphqlQuery<{ createDiscipleshipPlan: any }>(DiscipleshipPlanMutations.CREATE_DISCIPLESHIP_PLAN, {
            input: {
              member_id: input.member_id,
              pathway_id: input.pathway_id,
              mentor_id: input.mentor_name,
              start_date: input.start_date,
              target_completion_date: input.target_date,
              notes: input.notes,
            },
          });

          message = `Created discipleship plan for ${result.createDiscipleshipPlan.member.first_name} ${result.createDiscipleshipPlan.member.last_name}`;

          if (result.createDiscipleshipPlan.pathway) {
            message += ` on the ${result.createDiscipleshipPlan.pathway.name} pathway`;
          }

          if (result.createDiscipleshipPlan.mentor) {
            message += `, mentored by ${result.createDiscipleshipPlan.mentor.first_name} ${result.createDiscipleshipPlan.mentor.last_name}`;
          }

          console.log(`[ManageDiscipleshipPlanTool] ${message}`);

          return this.success({
            operation: 'create',
            plan: {
              id: result.createDiscipleshipPlan.id,
              member_id: result.createDiscipleshipPlan.member_id,
              member_name: `${result.createDiscipleshipPlan.member.first_name} ${result.createDiscipleshipPlan.member.last_name}`,
              pathway: result.createDiscipleshipPlan.pathway ? {
                id: result.createDiscipleshipPlan.pathway.id,
                name: result.createDiscipleshipPlan.pathway.name,
              } : null,
              mentor: result.createDiscipleshipPlan.mentor ? {
                id: result.createDiscipleshipPlan.mentor.id,
                name: `${result.createDiscipleshipPlan.mentor.first_name} ${result.createDiscipleshipPlan.mentor.last_name}`,
              } : null,
              status: result.createDiscipleshipPlan.status,
              target_date: result.createDiscipleshipPlan.target_completion_date || null,
              notes: result.createDiscipleshipPlan.notes || null,
              created_at: result.createDiscipleshipPlan.created_at,
            },
            message,
          });

        case 'update':
          if (!input.plan_id) {
            return this.error('plan_id is required when updating a discipleship plan');
          }

          result = await graphqlQuery<{ updateDiscipleshipPlan: any }>(DiscipleshipPlanMutations.UPDATE_DISCIPLESHIP_PLAN, {
            id: input.plan_id,
            input: {
              mentor_id: input.mentor_name,
              target_completion_date: input.target_date,
              notes: input.notes,
            },
          });

          message = `Updated discipleship plan`;
          console.log(`[ManageDiscipleshipPlanTool] ${message}`);

          return this.success({
            operation: 'update',
            plan: {
              id: result.updateDiscipleshipPlan.id,
              mentor: result.updateDiscipleshipPlan.mentor ? {
                id: result.updateDiscipleshipPlan.mentor.id,
                name: `${result.updateDiscipleshipPlan.mentor.first_name} ${result.updateDiscipleshipPlan.mentor.last_name}`,
              } : null,
              target_date: result.updateDiscipleshipPlan.target_completion_date || null,
              notes: result.updateDiscipleshipPlan.notes || null,
              updated_at: result.updateDiscipleshipPlan.updated_at,
            },
            message,
          });

        case 'complete':
          if (!input.plan_id) {
            return this.error('plan_id is required when completing a discipleship plan');
          }

          result = await graphqlQuery<{ completeDiscipleshipPlan: any }>(DiscipleshipPlanMutations.COMPLETE_DISCIPLESHIP_PLAN, {
            id: input.plan_id,
          });

          message = `Completed discipleship plan - member has finished their spiritual growth journey!`;
          console.log(`[ManageDiscipleshipPlanTool] ${message}`);

          return this.success({
            operation: 'complete',
            plan: {
              id: result.completeDiscipleshipPlan.id,
              status: result.completeDiscipleshipPlan.status,
              actual_completion_date: result.completeDiscipleshipPlan.actual_completion_date,
              updated_at: result.completeDiscipleshipPlan.updated_at,
            },
            message,
          });

        case 'archive':
          if (!input.plan_id) {
            return this.error('plan_id is required when archiving a discipleship plan');
          }

          result = await graphqlQuery<{ archiveDiscipleshipPlan: any }>(DiscipleshipPlanMutations.ARCHIVE_DISCIPLESHIP_PLAN, {
            id: input.plan_id,
          });

          message = `Archived discipleship plan`;
          console.log(`[ManageDiscipleshipPlanTool] ${message}`);

          return this.success({
            operation: 'archive',
            plan: {
              id: result.archiveDiscipleshipPlan.id,
              status: result.archiveDiscipleshipPlan.status,
              is_active: result.archiveDiscipleshipPlan.is_active,
              updated_at: result.archiveDiscipleshipPlan.updated_at,
            },
            message,
          });

        case 'delete':
          if (!input.plan_id) {
            return this.error('plan_id is required when deleting a discipleship plan');
          }

          result = await graphqlQuery<{ deleteDiscipleshipPlan: boolean }>(DiscipleshipPlanMutations.DELETE_DISCIPLESHIP_PLAN, {
            id: input.plan_id,
          });

          message = `Deleted discipleship plan`;
          console.log(`[ManageDiscipleshipPlanTool] ${message}`);

          return this.success({
            operation: 'delete',
            success: result.deleteDiscipleshipPlan,
            message,
          });

        case 'celebrate_milestone':
          if (!input.plan_id || !input.milestone_id) {
            return this.error('plan_id and milestone_id are required when celebrating a milestone');
          }

          result = await graphqlQuery<{ celebrateMilestone: any }>(DiscipleshipPlanMutations.CELEBRATE_MILESTONE, {
            planId: input.plan_id,
            milestoneId: input.milestone_id,
          });

          message = `Celebrated milestone: "${result.celebrateMilestone.milestone_name}"! This is a significant moment of spiritual growth.`;
          console.log(`[ManageDiscipleshipPlanTool] ${message}`);

          return this.success({
            operation: 'celebrate_milestone',
            milestone: {
              id: result.celebrateMilestone.id,
              name: result.celebrateMilestone.milestone_name,
              description: result.celebrateMilestone.milestone_description || null,
              completed_at: result.celebrateMilestone.completed_at,
              celebrated_at: result.celebrateMilestone.celebrated_at,
              notes: result.celebrateMilestone.notes || null,
            },
            message,
          });

        case 'uncelebrate_milestone':
          if (!input.plan_id || !input.milestone_id) {
            return this.error('plan_id and milestone_id are required when uncelebrating a milestone');
          }

          result = await graphqlQuery<{ uncelebrateMilestone: any }>(DiscipleshipPlanMutations.UNCELEBRATE_MILESTONE, {
            planId: input.plan_id,
            milestoneId: input.milestone_id,
          });

          message = `Removed celebration for milestone: "${result.uncelebrateMilestone.milestone_name}"`;
          console.log(`[ManageDiscipleshipPlanTool] ${message}`);

          return this.success({
            operation: 'uncelebrate_milestone',
            milestone: {
              id: result.uncelebrateMilestone.id,
              name: result.uncelebrateMilestone.milestone_name,
              celebrated_at: result.uncelebrateMilestone.celebrated_at,
            },
            message,
          });

        default:
          return this.error(`Unknown operation: ${input.operation}`);
      }
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to ${input.operation} discipleship plan: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: ManageDiscipleshipPlanInput): string {
    switch (input.operation) {
      case 'create':
        return `Creating discipleship plan...`;
      case 'update':
        return `Updating discipleship plan...`;
      case 'complete':
        return `Completing discipleship plan...`;
      case 'archive':
        return `Archiving discipleship plan...`;
      case 'delete':
        return `Deleting discipleship plan...`;
      case 'celebrate_milestone':
        return `Celebrating milestone achievement...`;
      case 'uncelebrate_milestone':
        return `Removing milestone celebration...`;
      default:
        return `Managing discipleship plan...`;
    }
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
MANAGE DISCIPLESHIP PLAN TOOL - Usage Instructions:

**When to Use:**
- User wants to create a new discipleship plan for a member
- User wants to update plan information (mentor, target date, notes)
- User wants to mark a journey as completed
- User wants to celebrate a milestone achievement
- User wants to archive or delete a plan

**Operations:**

1. **create**: Create a new discipleship plan for a member
   - Required: member_id, pathway_id (or pathway name), start_date
   - Optional: mentor_name, target_date, notes
   - Use when starting a new spiritual growth journey
   - Always confirm member and pathway before creating

2. **update**: Modify an existing discipleship plan
   - Required: plan_id
   - Optional: mentor_name, target_date, notes
   - Use to reassign mentors, update target dates, or modify journey notes

3. **complete**: Mark plan as completed
   - Required: plan_id
   - Marks journey as finished with actual completion date
   - Use when member completes all milestones and finishes pathway
   - This is a celebration moment!

4. **archive**: Mark plan as archived (inactive but preserved)
   - Required: plan_id
   - Sets status to archived and marks as inactive
   - Use when journey is discontinued or on hold
   - Preserves historical record without marking as complete

5. **delete**: Remove plan (soft delete)
   - Required: plan_id
   - Soft deletion - preserves historical record
   - ALWAYS get user confirmation before deleting
   - Use sparingly - prefer archive for inactive plans

6. **celebrate_milestone**: Mark milestone as celebrated
   - Required: plan_id, milestone_id
   - Records celebration timestamp
   - Sends celebration notifications to member and mentor
   - Use when member achieves significant growth milestone
   - Celebrations are special moments - be enthusiastic!

7. **uncelebrate_milestone**: Remove milestone celebration
   - Required: plan_id, milestone_id
   - Removes celebration timestamp
   - Use if milestone was celebrated by mistake
   - Rare operation - celebrations should generally stay

**Usage Tips:**
- Always confirm member identity before creating plans
- Choose appropriate pathways for member's spiritual stage
- Assign mentors for accountability and guidance
- Set realistic target dates (pathways typically take weeks/months)
- Include detailed notes about spiritual growth observations
- Celebrate milestones as they're achieved - celebrations matter!
- Complete plans when all milestones are done
- Archive plans that are discontinued (don't delete)
- Get confirmation before deleting plans

**Pathway Examples:**
Common pathways include:
- "Growth Track" - Foundational journey
- "Leadership Development" - For emerging leaders
- "Discipleship 101" - Basic discipleship
- "Membership Class" - New member orientation
- "Baptism Preparation" - Preparing for baptism
- "Small Group Journey" - Small group engagement

**Example Workflows:**

User: "Create a discipleship plan for John Smith on Growth Track"
Assistant:
1. Use search_members to find John Smith's ID
2. Call manage_discipleship_plan with operation="create", pathway_id="Growth Track", start_date=today
3. Respond: "I've created a Growth Track discipleship plan for John Smith. Would you like to assign a mentor or set a target completion date?"

User: "Assign Pastor Sarah as the mentor"
Assistant:
1. Call manage_discipleship_plan with operation="update", plan_id, mentor_name="Pastor Sarah"
2. Respond: "I've assigned Pastor Sarah as the mentor for John's discipleship journey. She can guide him through the Growth Track milestones."

User: "Celebrate the milestone for completing Bible Study Basics"
Assistant:
1. Call manage_discipleship_plan with operation="celebrate_milestone", plan_id, milestone_id
2. Respond: "🎉 Congratulations! I've celebrated John's completion of Bible Study Basics. This is a significant milestone in his spiritual growth journey! Notifications have been sent to both John and Pastor Sarah."

User: "Mark this journey as completed"
Assistant:
1. Call manage_discipleship_plan with operation="complete", plan_id
2. Respond: "🎊 Amazing! I've marked John's Growth Track journey as completed. He has successfully finished all milestones and completed his spiritual growth pathway. This is a wonderful achievement worth celebrating!"

**Important Notes:**
- ALWAYS get user confirmation before deleting plans
- Pathways guide spiritual growth - choose carefully
- Mentors provide accountability and guidance
- Milestones track progress - celebrate each one!
- Celebrations trigger notifications to member and mentor
- Completing a plan is a major achievement - be enthusiastic!
- Target dates provide accountability without pressure
- Notes help track spiritual growth observations
    `.trim();
  }
}
