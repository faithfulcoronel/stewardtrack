/**
 * SearchMembersTool
 * Searches for members by various criteria using GraphQL
 *
 * Features:
 * - Search by name, email, phone, or other criteria
 * - Returns list of matching members
 * - Supports filtering and limits
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, MemberQueries } from '@/lib/graphql/client';

export interface SearchMembersInput {
  search_term?: string;
  gender?: 'male' | 'female' | 'other';
  marital_status?: 'single' | 'married' | 'widowed' | 'divorced' | 'engaged';
  limit?: number;
}

export class SearchMembersTool extends BaseTool {
  readonly name = 'search_members';
  readonly description =
    'Searches for church members by partial name (first, middle, last, or preferred), email, phone, gender, or marital status. ' +
    'Supports partial matching - e.g., searching "Coronel" will find "Faithful Eli Coronel". ' +
    'Returns a list of matching members. Use this when the user wants to find multiple members ' +
    'or search by criteria like "all married members" or "members named John".';

  getCategory(): string {
    return 'Member Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Find all members named John',
      'Show me all married members',
      'List all female members',
      'Search for members with Smith in their name',
      'Find members in the database',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          description: 'Search term to match against first name, middle name, last name, preferred name, email, or phone number. Supports partial matching (e.g., "Faithful", "Eli", or "Coronel" will all find "Faithful Eli Coronel")',
        },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'other'],
          description: 'Filter by gender',
        },
        marital_status: {
          type: 'string',
          enum: ['single', 'married', 'widowed', 'divorced', 'engaged'],
          description: 'Filter by marital status',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of members to return (default: 50)',
        },
      },
      required: [],
    };
  }

  async execute(input: SearchMembersInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[SearchMembersTool] Using GraphQL query with searchTerm="${input.search_term}", gender=${input.gender}, maritalStatus=${input.marital_status}, limit=${input.limit || 50}`);

      // Use GraphQL searchMembers query (with caching)
      const result = await graphqlQuery<{ searchMembers: any[] }>(MemberQueries.SEARCH_MEMBERS, {
        searchTerm: input.search_term || '',
        gender: input.gender,
        maritalStatus: input.marital_status,
        limit: input.limit || 50,
      });

      const members = result.searchMembers;

      console.log(`[SearchMembersTool] Found ${members.length} members via GraphQL (filtering done by GraphQL resolver)`);

      // Format member data for response
      const formattedMembers = members.map(m => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        preferred_name: m.preferred_name || null,
        email: m.email || null,
        contact_number: m.contact_number || null,
        birthday: m.birthday || null,
        anniversary: m.anniversary || null,
        gender: m.gender,
        marital_status: m.marital_status,
        occupation: m.occupation || null,
      }));

      this.logSuccess(Date.now() - startTime);

      // Build search criteria description
      const criteria: string[] = [];
      if (input.search_term) criteria.push(`search: "${input.search_term}"`);
      if (input.gender) criteria.push(`gender: ${input.gender}`);
      if (input.marital_status) criteria.push(`marital status: ${input.marital_status}`);

      const criteriaText = criteria.length > 0 ? ` matching ${criteria.join(', ')}` : '';

      return this.success({
        members: formattedMembers,
        total: formattedMembers.length,
        search_term: input.search_term || null,
        filters: {
          gender: input.gender || null,
          marital_status: input.marital_status || null,
        },
        message: `Found ${formattedMembers.length} member(s)${criteriaText}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to search members: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: SearchMembersInput): string {
    if (input.search_term) {
      return `Searching for members matching "${input.search_term}"...`;
    }
    return 'Searching for members...';
  }

  /**
   * Generate UI components to display search results
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.members) {
      return null;
    }

    return [
      {
        type: 'MemberSearchResults',
        props: {
          members: result.data.members,
          total: result.data.total,
          searchTerm: result.data.search_term,
          filters: result.data.filters,
        },
      },
    ];
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
SEARCH MEMBERS TOOL - Usage Instructions:

**When to Use:**
- User wants to find multiple members
- User asks for a list of members matching criteria
- User wants to search by name, gender, or marital status
- User asks questions like "Show me all [criteria] members"

**Search Options:**
- search_term: Searches name, email, and phone number
- gender: Filter by male, female, or other
- marital_status: Filter by single, married, widowed, divorced, or engaged
- limit: Limit number of results (default 50)

**Usage Tips:**
- Use this tool for plural requests ("members" not "member")
- For single member lookups, use get_member_details instead
- Present results in a clear, organized format
- If too many results, suggest refining the search
- Respect the limit to avoid overwhelming the user

**Example Queries:**
User: "Show me all married members"
Assistant:
1. Calls search_members with marital_status="married"
2. Responds: "I found 45 married members. Here are the first 10: [list]"

User: "Find members named John"
Assistant:
1. Calls search_members with search_term="John"
2. Responds: "I found 7 members with 'John' in their name: [list with full names]"

User: "List all female members"
Assistant:
1. Calls search_members with gender="female"
2. Responds: "I found 152 female members. Here are the first 50: [list]"
    `.trim();
  }
}
