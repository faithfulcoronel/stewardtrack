/**
 * SearchFamiliesTool
 * Searches for families by various criteria using GraphQL
 *
 * Features:
 * - Search by name or address
 * - Filter by whether family has members
 * - Returns list of matching families with member count and head info
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, FamilyQueries } from '@/lib/graphql/client';

export interface SearchFamiliesInput {
  search_term?: string;
  has_members?: boolean;
  limit?: number;
}

export class SearchFamiliesTool extends BaseTool {
  readonly name = 'search_families';
  readonly description =
    'Searches for families by name, formal name, or address. ' +
    'Supports partial matching - e.g., searching "Smith" will find "Smith Family" or "The Smith Family". ' +
    'Can filter families with or without members. ' +
    'Returns a list of matching families with member count and head of family info. ' +
    'Use this when the user wants to find families or asks questions like "show me all families" or "find the Smith family".';

  getCategory(): string {
    return 'Family Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Find all families named Smith',
      'Show me families with no members',
      'List all families in the database',
      'Search for families in Manila',
      'Find families with members',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          description: 'Search term to match against family name, formal name, or address. Supports partial matching (e.g., "Smith" will find "Smith Family")',
        },
        has_members: {
          type: 'boolean',
          description: 'Filter families by whether they have members. true = only families with members, false = only families without members, undefined = all families',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of families to return (default: 50)',
        },
      },
      required: [],
    };
  }

  async execute(input: SearchFamiliesInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[SearchFamiliesTool] Using GraphQL query with searchTerm="${input.search_term}", hasMembers=${input.has_members}, limit=${input.limit || 50}`);

      // Use GraphQL searchFamilies query (with caching)
      const result = await graphqlQuery<{ searchFamilies: any[] }>(FamilyQueries.SEARCH_FAMILIES, {
        searchTerm: input.search_term || '',
        hasMembers: input.has_members,
        limit: input.limit || 50,
      });

      const families = result.searchFamilies;

      console.log(`[SearchFamiliesTool] Found ${families.length} families via GraphQL`);

      // Format family data for response
      const formattedFamilies = families.map(f => ({
        id: f.id,
        name: f.name,
        formal_name: f.formal_name || null,
        address: `${f.address_street || ''} ${f.address_city || ''} ${f.address_state || ''}`.trim() || null,
        member_count: f.member_count || 0,
        head_name: f.head?.member ? `${f.head.member.first_name} ${f.head.member.last_name}` : null,
        head_email: f.head?.member?.email || null,
        created_at: f.created_at,
      }));

      this.logSuccess(Date.now() - startTime);

      // Build search criteria description
      const criteria: string[] = [];
      if (input.search_term) criteria.push(`search: "${input.search_term}"`);
      if (input.has_members !== undefined) criteria.push(`has members: ${input.has_members ? 'yes' : 'no'}`);

      const criteriaText = criteria.length > 0 ? ` matching ${criteria.join(', ')}` : '';

      return this.success({
        families: formattedFamilies,
        total: formattedFamilies.length,
        search_term: input.search_term || null,
        filters: {
          has_members: input.has_members !== undefined ? input.has_members : null,
        },
        message: `Found ${formattedFamilies.length} famil${formattedFamilies.length === 1 ? 'y' : 'ies'}${criteriaText}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to search families: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: SearchFamiliesInput): string {
    if (input.search_term) {
      return `Searching for families matching "${input.search_term}"...`;
    }
    return 'Searching for families...';
  }

  /**
   * Generate UI components to display search results
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.families) {
      return null;
    }

    return [
      {
        type: 'FamilySearchResults',
        props: {
          families: result.data.families,
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
SEARCH FAMILIES TOOL - Usage Instructions:

**When to Use:**
- User wants to find families
- User asks for a list of families matching criteria
- User wants to search by family name or address
- User asks questions like "Show me all families" or "Find the Smith family"

**Search Options:**
- search_term: Searches family name, formal name, and address
- has_members: Filter by whether family has members (true/false/undefined)
- limit: Limit number of results (default 50)

**Usage Tips:**
- Use this tool for plural requests ("families" not "family")
- For single family lookup with full details, use get_family_details instead
- Present results in a clear, organized format
- If too many results, suggest refining the search
- Show member count and head of family for each result

**Example Queries:**
User: "Show me all families"
Assistant:
1. Calls search_families with no filters
2. Responds: "I found 45 families in the database. Here are the first 10: [list]"

User: "Find families named Smith"
Assistant:
1. Calls search_families with search_term="Smith"
2. Responds: "I found 3 families with 'Smith' in their name: [list with details]"

User: "List families with no members"
Assistant:
1. Calls search_families with has_members=false
2. Responds: "I found 12 families with no members: [list]"
    `.trim();
  }
}
