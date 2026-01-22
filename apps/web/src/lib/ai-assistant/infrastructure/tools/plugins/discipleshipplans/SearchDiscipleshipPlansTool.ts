/**
 * SearchDiscipleshipPlansTool
 * Searches for discipleship plans using GraphQL with various filters
 *
 * Features:
 * - Search by text (in notes or pathway name)
 * - Filter by status (active, completed, archived)
 * - Filter by pathway (e.g., "Growth Track", "Leadership Development")
 * - Filter by mentor
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, DiscipleshipPlanQueries } from '@/lib/graphql/client';

export interface SearchDiscipleshipPlansInput {
  search_term?: string;
  status?: string;
  pathway?: string;
  mentor_name?: string;
  limit?: number;
}

export class SearchDiscipleshipPlansTool extends BaseTool {
  readonly name = 'search_discipleship_plans';
  readonly description =
    'Searches for member discipleship plans by text, status, pathway, or mentor. ' +
    'Returns a list of discipleship plans with member information, pathway, mentor, status, and progress. ' +
    'Use this when the user wants to find discipleship plans or check on member spiritual growth journeys.';

  getCategory(): string {
    return 'Discipleship Plan Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me all active discipleship plans',
      'Find members on the Growth Track pathway',
      'Search for discipleship plans mentored by Pastor Sarah',
      'List all completed discipleship journeys',
      'Show me members in leadership development',
      'Find discipleship plans that are almost complete',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          description: 'Text to search for in plan notes or pathway names (optional)',
        },
        status: {
          type: 'string',
          description: 'Filter by status (e.g., "active", "completed", "archived") (optional)',
        },
        pathway: {
          type: 'string',
          description: 'Filter by pathway name (e.g., "Growth Track", "Leadership Development") (optional)',
        },
        mentor_name: {
          type: 'string',
          description: 'Filter by mentor name (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: [],
    };
  }

  async execute(input: SearchDiscipleshipPlansInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[SearchDiscipleshipPlansTool] Using GraphQL query with filters: term="${input.search_term}", status=${input.status}, pathway=${input.pathway}, mentor=${input.mentor_name}, limit=${input.limit || 50}`);

      // Use GraphQL searchDiscipleshipPlans query
      const result = await graphqlQuery<{ searchDiscipleshipPlans: any[] }>(DiscipleshipPlanQueries.SEARCH_DISCIPLESHIP_PLANS, {
        searchTerm: input.search_term || '',
        status: input.status,
        pathwayId: input.pathway, // Note: pathwayId is used to filter by pathway name in resolvers
        mentorId: input.mentor_name, // Note: mentorId is used to filter by mentor name in resolvers
        limit: input.limit || 50,
      });

      const plans = result.searchDiscipleshipPlans;

      console.log(`[SearchDiscipleshipPlansTool] Found ${plans.length} discipleship plans`);

      // Format results for AI
      const formattedPlans = plans.map(plan => ({
        id: plan.id,
        member: plan.member ? {
          id: plan.member.id,
          name: `${plan.member.first_name} ${plan.member.last_name}`,
          email: plan.member.email || null,
          contact_number: plan.member.contact_number || null,
        } : null,
        pathway: plan.pathway?.name || plan.pathway || null,
        mentor: plan.mentor ? {
          id: plan.mentor.id,
          name: `${plan.mentor.first_name} ${plan.mentor.last_name}`,
        } : null,
        status: plan.status || 'active',
        progress: {
          completed_milestones: plan.completed_milestones_count || 0,
          total_milestones: plan.total_milestones_count || 0,
          percentage: plan.progress_percentage || 0,
        },
        target_date: plan.target_completion_date || null,
        notes: plan.notes || null,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }));

      this.logSuccess(Date.now() - startTime);

      return this.success({
        plans: formattedPlans,
        total: formattedPlans.length,
        message: formattedPlans.length === 0
          ? 'No discipleship plans found matching the search criteria'
          : `Found ${formattedPlans.length} discipleship plan${formattedPlans.length === 1 ? '' : 's'}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to search discipleship plans: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: SearchDiscipleshipPlansInput): string {
    if (input.search_term) {
      return `Searching for discipleship plans matching "${input.search_term}"...`;
    }
    if (input.pathway) {
      return `Finding members on the ${input.pathway} pathway...`;
    }
    if (input.mentor_name) {
      return `Finding plans mentored by ${input.mentor_name}...`;
    }
    return `Searching for discipleship plans...`;
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
SEARCH DISCIPLESHIP PLANS TOOL - Usage Instructions:

**When to Use:**
- User asks to find or search for discipleship plans
- User wants to see members on a specific pathway (e.g., "Growth Track")
- User wants to find plans by mentor
- User wants to see active or completed discipleship journeys
- User asks about spiritual growth progress

**Search Options:**
- search_term: Search in plan notes or pathway names
- status: Filter by "active", "completed", or "archived"
- pathway: Filter by pathway name (e.g., "Growth Track", "Leadership Development")
- mentor_name: Filter by mentor name
- limit: Control number of results (default 50)

**Response Format:**
Each plan includes:
- Member information (name, email, contact)
- Pathway name and description
- Mentor information (if assigned)
- Status (active/completed/archived)
- Progress (completed milestones vs total milestones, percentage)
- Target completion date
- Notes about the journey
- Timestamps

**Usage Tips:**
- Use this first to find plans before getting details
- Combine multiple filters for specific results
- Check progress_percentage to find plans nearing completion
- Use status="active" to see only ongoing journeys
- Use pathway filter to focus on specific tracks

**Example Workflows:**

User: "Show me all members on the Growth Track"
Assistant:
1. Call search_discipleship_plans with pathway="Growth Track"
2. Present results with member names and progress

User: "Find discipleship plans that Pastor Sarah is mentoring"
Assistant:
1. Call search_discipleship_plans with mentor_name="Pastor Sarah"
2. Show list of mentees and their progress

User: "Which discipleship journeys are almost complete?"
Assistant:
1. Call search_discipleship_plans with status="active"
2. Filter results by progress_percentage > 75
3. Highlight members close to finishing

**Important Notes:**
- Progress is tracked through milestones (celebrations)
- Active plans are ongoing discipleship journeys
- Completed plans represent finished pathways
- Archived plans are inactive but preserved for records
    `.trim();
  }
}
