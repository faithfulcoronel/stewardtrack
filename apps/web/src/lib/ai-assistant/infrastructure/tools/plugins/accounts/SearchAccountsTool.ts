/**
 * SearchAccountsTool
 * Searches for accounts using GraphQL with various filters
 *
 * Features:
 * - Search by text (in name, description, email)
 * - Filter by account type (organization, person)
 * - Filter by active status
 * - Filter by member ID
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, AccountQueries } from '@/lib/graphql/client';

export interface SearchAccountsInput {
  search_term?: string;
  account_type?: 'organization' | 'person';
  is_active?: boolean;
  member_id?: string;
  limit?: number;
}

export class SearchAccountsTool extends BaseTool {
  readonly name = 'search_accounts';
  readonly description =
    'Searches for accounts by name, type, or status. ' +
    'Returns a list of accounts with account details, member associations, and contact information. ' +
    'Use this when the user wants to find accounts or check on account information.';

  getCategory(): string {
    return 'Account Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me all active accounts',
      'Find all organization accounts',
      'Search for accounts for member John Smith',
      'List all person accounts',
      'Find inactive accounts',
      'Show me all accounts matching "Church"',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          description: 'Text to search for in account name, description, or email (optional)',
        },
        account_type: {
          type: 'string',
          enum: ['organization', 'person'],
          description: 'Filter by account type: "organization" or "person" (optional)',
        },
        is_active: {
          type: 'boolean',
          description: 'Filter by active status (optional)',
        },
        member_id: {
          type: 'string',
          description: 'Filter by associated member ID (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: [],
    };
  }

  async execute(input: SearchAccountsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[SearchAccountsTool] Using GraphQL query with filters: term="${input.search_term}", type=${input.account_type}, active=${input.is_active}, memberId=${input.member_id}, limit=${input.limit || 50}`);

      // Use GraphQL searchAccounts query
      const result = await graphqlQuery<{ searchAccounts: any[] }>(AccountQueries.SEARCH_ACCOUNTS, {
        searchTerm: input.search_term || '',
        accountType: input.account_type,
        isActive: input.is_active,
        memberId: input.member_id,
        limit: input.limit || 50,
      });

      const accounts = result.searchAccounts;

      console.log(`[SearchAccountsTool] Found ${accounts.length} accounts`);

      // Format accounts for AI response
      const formattedAccounts = accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        account_type: acc.account_type,
        account_number: acc.account_number,
        description: acc.description || null,
        email: acc.email || null,
        phone: acc.phone || null,
        address: acc.address || null,
        website: acc.website || null,
        is_active: acc.is_active,
        member: acc.member ? {
          id: acc.member.id,
          name: `${acc.member.first_name} ${acc.member.last_name}`,
          email: acc.member.email || null,
          contact_number: acc.member.contact_number || null,
        } : null,
        created_at: acc.created_at,
        updated_at: acc.updated_at,
      }));

      this.logSuccess(Date.now() - startTime);

      return this.success({
        accounts: formattedAccounts,
        total: formattedAccounts.length,
        message: `Found ${formattedAccounts.length} account(s)`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to search accounts: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: SearchAccountsInput): string {
    if (input.account_type) {
      return `Searching for ${input.account_type} accounts...`;
    }
    if (input.is_active !== undefined) {
      return `Searching for ${input.is_active ? 'active' : 'inactive'} accounts...`;
    }
    if (input.search_term) {
      return `Searching for accounts matching "${input.search_term}"...`;
    }
    return 'Searching for accounts...';
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
SEARCH ACCOUNTS TOOL - Usage Instructions:

**When to Use:**
- User asks to see or find accounts
- User wants to check account information
- User asks for accounts by type (organization, person)
- User asks for active or inactive accounts
- User wants to find accounts associated with a member

**Search Parameters:**
- search_term: Text search in account name, description, or email
- account_type: Filter by type (organization, person)
- is_active: Filter by active status (boolean)
- member_id: Filter by associated member
- limit: Maximum results (default: 50)

**Usage Tips:**
- Multiple filters can be combined
- Leave search_term empty to get all accounts with other filters
- Account types: "organization" for businesses/entities, "person" for individual accounts
- Always show member association if available
- Display account status (active/inactive)

**Example Responses:**

User: "Show me all active accounts"
Assistant:
1. Calls search_accounts with is_active=true
2. Responds: "I found [X] active accounts:
   - [Account Name] - [Type] - Account# [Number]
   - Contact: [Email/Phone]
   - Associated Member: [Member Name]"

User: "Find all organization accounts"
Assistant:
1. Calls search_accounts with account_type="organization"
2. Lists organization accounts with details

User: "Search for accounts for member John Smith"
Assistant:
1. First use search_members to find John Smith's ID
2. Call search_accounts with member_id
3. Show accounts associated with John Smith

User: "Find accounts with 'Church' in the name"
Assistant:
1. Calls search_accounts with search_term="Church"
2. Shows matching accounts with details

**Important Notes:**
- Present results in a clear, organized format
- Always mention the account type and status
- Show member association if available
- Display contact information (email, phone, address)
- Offer to get more details if needed (use get_account_details tool)
    `.trim();
  }
}
