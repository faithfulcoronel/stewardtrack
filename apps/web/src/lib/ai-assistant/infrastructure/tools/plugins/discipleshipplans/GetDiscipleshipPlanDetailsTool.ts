/**
 * GetDiscipleshipPlanDetailsTool
 * Retrieves detailed information about a specific discipleship plan using GraphQL
 *
 * Features:
 * - Get plan by ID
 * - Returns complete plan information including member details
 * - Shows pathway with all milestones
 * - Shows mentor with contact information
 * - Includes progress tracking and celebration status
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, DiscipleshipPlanQueries } from '@/lib/graphql/client';

export interface GetDiscipleshipPlanDetailsInput {
  plan_id: string;
}

export class GetDiscipleshipPlanDetailsTool extends BaseTool {
  readonly name = 'get_discipleship_plan_details';
  readonly description =
    'Retrieves detailed information about a specific discipleship plan by ID. ' +
    'Returns complete plan information including member details, pathway with milestones, mentor, status, progress, and celebration history. ' +
    'Use this when the user asks for details about a specific discipleship plan or wants to see a member\'s spiritual growth journey progress.';

  getCategory(): string {
    return 'Discipleship Plan Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me details about discipleship plan ID abc123',
      'Get information about this discipleship plan',
      'What are the details of this member\'s spiritual journey?',
      'Show me the full discipleship plan with milestones',
      'What\'s the status of discipleship plan xyz789?',
      'How many milestones has this member completed?',
    ];
  }

  /**
   * Required permission for viewing discipleship plan details
   */
  protected getRequiredPermissions(): string[] {
    return ['discipleshipplans:view'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        plan_id: {
          type: 'string',
          description: 'The unique ID of the discipleship plan to retrieve',
        },
      },
      required: ['plan_id'],
    };
  }

  async execute(input: GetDiscipleshipPlanDetailsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[GetDiscipleshipPlanDetailsTool] Using GraphQL query with planId="${input.plan_id}"`);

      // Use GraphQL getDiscipleshipPlan query
      const result = await graphqlQuery<{ getDiscipleshipPlan: any }>(DiscipleshipPlanQueries.GET_DISCIPLESHIP_PLAN, {
        id: input.plan_id,
      });

      const plan = result.getDiscipleshipPlan;

      if (!plan) {
        console.log(`[GetDiscipleshipPlanDetailsTool] Discipleship plan not found`);
        return this.error(`Discipleship plan with ID "${input.plan_id}" not found`);
      }

      console.log(`[GetDiscipleshipPlanDetailsTool] Found discipleship plan for member ${plan.member_id}`);

      // Format plan data
      const formattedPlan = {
        id: plan.id,
        member: {
          id: plan.member.id,
          name: `${plan.member.first_name} ${plan.member.last_name}`,
          preferred_name: plan.member.preferred_name || null,
          email: plan.member.email || null,
          contact_number: plan.member.contact_number || null,
          profile_picture_url: plan.member.profile_picture_url || null,
        },
        pathway: plan.pathway ? {
          id: plan.pathway.id,
          name: plan.pathway.name,
          description: plan.pathway.description || null,
          duration_weeks: plan.pathway.duration_weeks || null,
          total_milestones: plan.pathway.milestones?.length || 0,
        } : null,
        mentor: plan.mentor ? {
          id: plan.mentor.id,
          name: `${plan.mentor.first_name} ${plan.mentor.last_name}`,
          email: plan.mentor.email || null,
          contact_number: plan.mentor.contact_number || null,
        } : null,
        status: plan.status || 'active',
        progress: {
          completed_milestones: plan.completed_milestones_count || 0,
          total_milestones: plan.total_milestones_count || 0,
          percentage: plan.progress_percentage || 0,
        },
        milestones: (plan.milestones || []).map((m: any) => ({
          id: m.id,
          name: m.milestone_name,
          description: m.milestone_description || null,
          completed_at: m.completed_at || null,
          celebrated_at: m.celebrated_at || null,
          is_celebrated: !!m.celebrated_at,
          notes: m.notes || null,
          sort_order: m.sort_order || 0,
        })),
        target_date: plan.target_completion_date || null,
        actual_completion_date: plan.actual_completion_date || null,
        notes: plan.notes || null,
        is_active: plan.is_active,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      };

      this.logSuccess(Date.now() - startTime);

      return this.success({
        plan: formattedPlan,
        message: `Retrieved discipleship plan details for ${formattedPlan.member.name}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get discipleship plan details: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: GetDiscipleshipPlanDetailsInput): string {
    return `Retrieving discipleship plan details...`;
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET DISCIPLESHIP PLAN DETAILS TOOL - Usage Instructions:

**When to Use:**
- User asks for detailed information about a specific discipleship plan
- User wants to see full plan information for a member
- User needs to know milestone progress and celebrations
- User asks about mentor or pathway details
- User wants to see completion status and target dates

**Required Parameters:**
- plan_id: The unique ID of the discipleship plan (required)

**Information Returned:**
- Complete member information (name, email, contact, profile picture)
- Pathway details (name, description, duration, total milestones)
- Mentor information with contact details
- Status (active/completed/archived)
- Progress tracking (completed milestones vs total, percentage)
- All milestones with celebration status
- Target and actual completion dates
- Detailed journey notes
- Active status and timestamps

**Usage Tips:**
- Present pathway and progress prominently
- Highlight celebrated milestones (celebrations are special!)
- Show mentor contact for coordination
- Note if plan is nearing completion (high percentage)
- Show target date for accountability
- List uncelebrated completed milestones as opportunities

**Example Responses:**

User: "Show me details about discipleship plan abc123"
Assistant:
1. Calls get_discipleship_plan_details with plan_id="abc123"
2. Responds: "Here are the details for John Smith's discipleship plan:

   **Member:** John Smith (john@example.com, 555-1234)
   **Pathway:** Growth Track - A foundational journey through Christian basics
   **Mentor:** Pastor Sarah Jones (sarah@church.com)
   **Status:** Active
   **Progress:** 6 of 8 milestones completed (75%)
   **Target Completion:** March 15, 2026

   **Milestones:**
   ✅ 1. Introduction to Faith (Celebrated January 5)
   ✅ 2. Understanding Prayer (Celebrated January 19)
   ✅ 3. Bible Study Basics (Celebrated February 2)
   ✅ 4. Community Connection (Celebrated February 16)
   ✅ 5. Serving Others (Celebrated March 1)
   ✅ 6. Spiritual Gifts Discovery (Celebrated March 8)
   ⏳ 7. Leadership Foundations (Not yet started)
   ⏳ 8. Ministry Commissioning (Not yet started)

   **Journey Notes:**
   John has shown exceptional growth in understanding prayer and is eager to discover his spiritual gifts for serving in children's ministry.

   John is making great progress and is on track to complete his Growth Track journey by mid-March!"

User: "What's the status of this member's spiritual journey?"
Assistant:
1. Calls get_discipleship_plan_details
2. Responds with current status, progress percentage, and next steps

User: "Who is mentoring this member?"
Assistant:
1. Calls get_discipleship_plan_details
2. Responds with mentor name and contact information for coordination

**Important Notes:**
- Celebrated milestones represent significant spiritual growth moments
- Progress percentage helps track journey completion
- Mentor information is crucial for care coordination
- Target dates provide accountability and planning
- Active status indicates ongoing journey (vs completed/archived)
- Milestones are ordered by sort_order for proper sequence
    `.trim();
  }
}
