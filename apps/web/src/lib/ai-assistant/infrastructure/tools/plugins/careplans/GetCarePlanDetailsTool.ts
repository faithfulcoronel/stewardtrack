/**
 * GetCarePlanDetailsTool
 * Retrieves detailed information about a specific care plan using GraphQL
 *
 * Features:
 * - Get care plan by ID
 * - Returns complete care plan information including member details
 * - Shows assigned caregiver with contact information
 * - Includes follow-up dates and care plan status
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, CarePlanQueries } from '@/lib/graphql/client';

export interface GetCarePlanDetailsInput {
  care_plan_id: string;
}

export class GetCarePlanDetailsTool extends BaseTool {
  readonly name = 'get_care_plan_details';
  readonly description =
    'Retrieves detailed information about a specific care plan by ID. ' +
    'Returns complete care plan information including member details, assigned caregiver, status, priority, follow-up dates, and care notes. ' +
    'Use this when the user asks for details about a specific care plan or wants to see full information about a member\'s pastoral care.';

  getCategory(): string {
    return 'Care Plan Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me details about care plan ID abc123',
      'Get information about this care plan',
      'What are the details of this pastoral care case?',
      'Show me the full care plan for this member',
      'What\'s the status of care plan xyz789?',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        care_plan_id: {
          type: 'string',
          description: 'The unique ID of the care plan to retrieve',
        },
      },
      required: ['care_plan_id'],
    };
  }

  async execute(input: GetCarePlanDetailsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[GetCarePlanDetailsTool] Using GraphQL query with carePlanId="${input.care_plan_id}"`);

      // Use GraphQL getCarePlan query
      const result = await graphqlQuery<{ getCarePlan: any }>(CarePlanQueries.GET_CARE_PLAN, {
        id: input.care_plan_id,
      });

      const carePlan = result.getCarePlan;

      if (!carePlan) {
        console.log(`[GetCarePlanDetailsTool] Care plan not found`);
        return this.error(`Care plan with ID "${input.care_plan_id}" not found`);
      }

      console.log(`[GetCarePlanDetailsTool] Found care plan for member ${carePlan.member_id}`);

      // Format care plan data
      const formattedCarePlan = {
        id: carePlan.id,
        member: {
          id: carePlan.member.id,
          name: `${carePlan.member.first_name} ${carePlan.member.last_name}`,
          preferred_name: carePlan.member.preferred_name || null,
          email: carePlan.member.email || null,
          contact_number: carePlan.member.contact_number || null,
          profile_picture_url: carePlan.member.profile_picture_url || null,
        },
        status: {
          code: carePlan.status_code,
          label: carePlan.status_label || null,
        },
        priority: carePlan.priority || null,
        assigned_to: carePlan.assigned_to_member ? {
          id: carePlan.assigned_to_member.id,
          name: `${carePlan.assigned_to_member.first_name} ${carePlan.assigned_to_member.last_name}`,
          email: carePlan.assigned_to_member.email || null,
          contact_number: carePlan.assigned_to_member.contact_number || null,
        } : null,
        follow_up_at: carePlan.follow_up_at || null,
        closed_at: carePlan.closed_at || null,
        details: carePlan.details || null,
        membership_stage_id: carePlan.membership_stage_id || null,
        is_active: carePlan.is_active,
        created_at: carePlan.created_at,
        updated_at: carePlan.updated_at,
      };

      this.logSuccess(Date.now() - startTime);

      return this.success({
        care_plan: formattedCarePlan,
        message: `Retrieved care plan details for ${formattedCarePlan.member.name}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get care plan details: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: GetCarePlanDetailsInput): string {
    return `Retrieving care plan details...`;
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET CARE PLAN DETAILS TOOL - Usage Instructions:

**When to Use:**
- User asks for detailed information about a specific care plan
- User wants to see full care plan information for a member
- User needs to know who is assigned to a care plan
- User asks about care plan status, priority, or follow-up dates
- User wants to see pastoral care notes for a member

**Required Parameters:**
- care_plan_id: The unique ID of the care plan (required)

**Information Returned:**
- Complete member information (name, email, contact)
- Care plan status and status label
- Priority level (low, normal, high, urgent)
- Assigned caregiver with contact information
- Follow-up date (if scheduled)
- Closed date (if care plan is closed)
- Detailed care notes
- Membership stage ID
- Active status
- Created and updated timestamps

**Usage Tips:**
- Present care plan information in a clear, structured format
- Highlight priority level if urgent or high
- Show follow-up date prominently if scheduled
- Include assigned caregiver contact information for coordination
- Mention if care plan is closed and when
- Show care notes/details clearly

**Example Responses:**

User: "Show me details about care plan abc123"
Assistant:
1. Calls get_care_plan_details with care_plan_id="abc123"
2. Responds: "Here are the details for this care plan:

   **Member:** John Smith (john@example.com, 555-1234)
   **Status:** Active - Hospital Visit Needed
   **Priority:** High
   **Assigned Caregiver:** Pastor Sarah Jones (sarah@church.com)
   **Follow-up Date:** January 25, 2026

   **Care Notes:**
   John is recovering from surgery and needs a pastoral visit. He expressed feeling isolated and would appreciate prayer and fellowship. Family is supportive but working during weekdays.

   **Care Plan Created:** January 15, 2026
   **Last Updated:** January 22, 2026"

User: "What's the status of this care plan?"
Assistant:
1. Calls get_care_plan_details
2. Responds with current status, priority, and any follow-up information

User: "Who is handling this care case?"
Assistant:
1. Calls get_care_plan_details
2. Responds with assigned caregiver name and contact information

**Important Notes:**
- Always present complete contact information for coordination
- Highlight urgent or high-priority cases
- Note if care plan is inactive or closed
- Show follow-up dates clearly to help with scheduling
- Offer to help with updates or modifications if needed
    `.trim();
  }
}
