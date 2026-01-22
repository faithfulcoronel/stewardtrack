/**
 * SearchCarePlansTool
 * Searches for care plans using GraphQL with various filters
 *
 * Features:
 * - Search by text (in details or status label)
 * - Filter by status (active, completed, pending, etc.)
 * - Filter by priority (low, normal, high, urgent)
 * - Filter by assigned caregiver
 * - Find upcoming follow-ups (within next 7 days)
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, CarePlanQueries } from '@/lib/graphql/client';

export interface SearchCarePlansInput {
  search_term?: string;
  status?: string;
  priority?: string;
  assigned_to_member_id?: string;
  upcoming_follow_ups?: boolean;
  limit?: number;
}

export class SearchCarePlansTool extends BaseTool {
  readonly name = 'search_care_plans';
  readonly description =
    'Searches for member care plans by text, status, priority, assigned caregiver, or upcoming follow-ups. ' +
    'Returns a list of care plans with member information, status, priority, assigned caregiver, and follow-up dates. ' +
    'Use this when the user wants to find care plans or check on member pastoral care status.';

  getCategory(): string {
    return 'Care Plan Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me all active care plans',
      'Find care plans with upcoming follow-ups',
      'Search for care plans for high priority members',
      'Show me care plans assigned to John Smith',
      'List all urgent care plans',
      'Find care plans for members needing hospital visits',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          description: 'Text to search for in care plan details or status labels (optional)',
        },
        status: {
          type: 'string',
          description: 'Filter by status code (e.g., "active", "completed", "pending") (optional)',
        },
        priority: {
          type: 'string',
          description: 'Filter by priority level (e.g., "low", "normal", "high", "urgent") (optional)',
        },
        assigned_to_member_id: {
          type: 'string',
          description: 'Filter by assigned caregiver member ID (optional)',
        },
        upcoming_follow_ups: {
          type: 'boolean',
          description: 'If true, only returns care plans with follow-ups in the next 7 days (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: [],
    };
  }

  async execute(input: SearchCarePlansInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[SearchCarePlansTool] Using GraphQL query with filters: term="${input.search_term}", status=${input.status}, priority=${input.priority}, assignedTo=${input.assigned_to_member_id}, upcomingFollowUps=${input.upcoming_follow_ups}, limit=${input.limit || 50}`);

      // Use GraphQL searchCarePlans query
      const result = await graphqlQuery<{ searchCarePlans: any[] }>(CarePlanQueries.SEARCH_CARE_PLANS, {
        searchTerm: input.search_term || '',
        status: input.status,
        priority: input.priority,
        assignedToMemberId: input.assigned_to_member_id,
        upcomingFollowUps: input.upcoming_follow_ups,
        limit: input.limit || 50,
      });

      const carePlans = result.searchCarePlans;

      console.log(`[SearchCarePlansTool] Found ${carePlans.length} care plans`);

      // Format care plans for AI response
      const formattedCarePlans = carePlans.map(cp => ({
        id: cp.id,
        member: {
          id: cp.member?.id,
          name: cp.member ? `${cp.member.first_name} ${cp.member.last_name}` : null,
          email: cp.member?.email || null,
          contact_number: cp.member?.contact_number || null,
        },
        status: {
          code: cp.status_code,
          label: cp.status_label || null,
        },
        priority: cp.priority || null,
        assigned_to: cp.assigned_to_member ? {
          id: cp.assigned_to_member.id,
          name: `${cp.assigned_to_member.first_name} ${cp.assigned_to_member.last_name}`,
          email: cp.assigned_to_member.email || null,
        } : null,
        follow_up_at: cp.follow_up_at || null,
        details: cp.details || null,
        is_active: cp.is_active,
        created_at: cp.created_at,
        updated_at: cp.updated_at,
      }));

      this.logSuccess(Date.now() - startTime);

      return this.success({
        care_plans: formattedCarePlans,
        total: formattedCarePlans.length,
        message: `Found ${formattedCarePlans.length} care plan(s)`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to search care plans: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: SearchCarePlansInput): string {
    if (input.upcoming_follow_ups) {
      return 'Searching for care plans with upcoming follow-ups...';
    }
    if (input.status) {
      return `Searching for ${input.status} care plans...`;
    }
    if (input.priority) {
      return `Searching for ${input.priority} priority care plans...`;
    }
    if (input.search_term) {
      return `Searching for care plans matching "${input.search_term}"...`;
    }
    return 'Searching for care plans...';
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
SEARCH CARE PLANS TOOL - Usage Instructions:

**When to Use:**
- User asks to see or find care plans
- User wants to check pastoral care status for members
- User asks for care plans by status (active, completed, pending)
- User asks for care plans by priority (low, normal, high, urgent)
- User wants to see upcoming follow-ups or pastoral visits
- User asks for care plans assigned to a specific person

**Search Parameters:**
- search_term: Text search in care plan details or status labels
- status: Filter by status code (active, completed, pending, etc.)
- priority: Filter by priority level (low, normal, high, urgent, critical)
- assigned_to_member_id: Filter by assigned caregiver
- upcoming_follow_ups: Only show follow-ups in next 7 days (boolean)
- limit: Maximum results (default: 50)

**Usage Tips:**
- Multiple filters can be combined
- Leave search_term empty to get all care plans with other filters
- Use upcoming_follow_ups=true to find members needing visits soon
- Priority helps identify urgent pastoral needs
- Always show assigned caregiver if available

**Example Responses:**

User: "Show me all active care plans"
Assistant:
1. Calls search_care_plans with status="active"
2. Responds: "I found [X] active care plans:
   - [Member Name] - [Priority] - Assigned to [Caregiver]
   - Follow-up: [Date]
   - Details: [Brief summary]"

User: "Who needs pastoral visits this week?"
Assistant:
1. Calls search_care_plans with upcoming_follow_ups=true
2. Responds with list of members and their follow-up dates

User: "Show me all urgent care plans"
Assistant:
1. Calls search_care_plans with priority="urgent"
2. Lists urgent cases with details and assigned caregivers

User: "Find care plans for hospital visits"
Assistant:
1. Calls search_care_plans with search_term="hospital"
2. Shows matching care plans with details

**Important Notes:**
- Present results in a clear, organized format
- Always mention the assigned caregiver if available
- Highlight upcoming follow-up dates
- Note priority level for urgent cases
- Offer to get more details if needed (use get_care_plan_details tool)
    `.trim();
  }
}
