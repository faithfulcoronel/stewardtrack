/**
 * GetAccountDetailsTool
 * Retrieves detailed information about a specific account using GraphQL
 *
 * Features:
 * - Get account by ID
 * - Get account by member ID
 * - Returns full account details including sensitive information (encrypted fields)
 * - Uses GraphQL for efficient data retrieval
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, AccountQueries } from '@/lib/graphql/client';

export interface GetAccountDetailsInput {
  account_id?: string;
  member_id?: string;
}

export class GetAccountDetailsTool extends BaseTool {
  readonly name = 'get_account_details';
  readonly description =
    'Retrieves detailed information about a specific account by account ID or member ID. ' +
    'Returns complete account information including contact details, notes, and member associations. ' +
    'Use this when the user wants detailed information about a specific account.';

  getCategory(): string {
    return 'Account Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Get details for account ACC-12345',
      'Show me account information for member John Smith',
      'What are the details of this account?',
      'Tell me about account [ID]',
      'Get account information for this member',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        account_id: {
          type: 'string',
          description: 'The unique ID of the account (use this if you have the account ID)',
        },
        member_id: {
          type: 'string',
          description: 'The unique ID of the member (use this to find account by member)',
        },
      },
      required: [],
    };
  }

  async execute(input: GetAccountDetailsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      if (!input.account_id && !input.member_id) {
        return this.error('Either account_id or member_id is required');
      }

      let account: any = null;

      if (input.account_id) {
        console.log(`[GetAccountDetailsTool] Getting account by ID: ${input.account_id}`);
        const result = await graphqlQuery<{ getAccount: any }>(AccountQueries.GET_ACCOUNT, {
          id: input.account_id,
        });
        account = result.getAccount;
      } else if (input.member_id) {
        console.log(`[GetAccountDetailsTool] Getting account by member ID: ${input.member_id}`);
        const result = await graphqlQuery<{ getAccountByMember: any }>(AccountQueries.GET_ACCOUNT_BY_MEMBER, {
          memberId: input.member_id,
        });
        account = result.getAccountByMember;
      }

      if (!account) {
        console.log(`[GetAccountDetailsTool] Account not found`);
        return this.error('Account not found');
      }

      console.log(`[GetAccountDetailsTool] Found account: ${account.name}`);

      // Format account for AI response
      const formattedAccount = {
        id: account.id,
        name: account.name,
        account_type: account.account_type,
        account_number: account.account_number,
        description: account.description || null,
        contact_info: {
          email: account.email || null,
          phone: account.phone || null,
          address: account.address || null,
          website: account.website || null,
        },
        tax_id: account.tax_id || null,
        is_active: account.is_active,
        notes: account.notes || null,
        member: account.member ? {
          id: account.member.id,
          name: `${account.member.first_name} ${account.member.last_name}`,
          email: account.member.email || null,
          contact_number: account.member.contact_number || null,
          profile_picture_url: account.member.profile_picture_url || null,
        } : null,
        created_at: account.created_at,
        updated_at: account.updated_at,
      };

      this.logSuccess(Date.now() - startTime);

      return this.success({
        account: formattedAccount,
        message: `Retrieved account details for ${account.name}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get account details: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: GetAccountDetailsInput): string {
    if (input.account_id) {
      return `Retrieving account details...`;
    }
    if (input.member_id) {
      return `Finding account for member...`;
    }
    return 'Getting account information...';
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET ACCOUNT DETAILS TOOL - Usage Instructions:

**When to Use:**
- User asks for detailed information about a specific account
- User wants to see complete account information
- User asks about account details by account ID or member
- Follow-up to search results to get more details

**Input Parameters:**
- account_id: The unique account ID (use if you have it from search results)
- member_id: The member ID (use to find the account by member association)
- At least one parameter is required

**Usage Tips:**
- Use account_id when you have it from previous search results
- Use member_id when user mentions a member but not the account ID
- This tool returns ALL account details including sensitive info (tax ID, notes)
- Always present information in a clear, organized format
- Protect sensitive information - be mindful of tax IDs and notes

**Example Responses:**

User: "Show me details for account ACC-12345"
Assistant:
1. Calls get_account_details with account_id="ACC-12345"
2. Responds with formatted account information:
   "Here are the details for [Account Name]:
   - Type: [organization/person]
   - Account Number: ACC-12345
   - Status: [Active/Inactive]
   - Contact: [Email/Phone/Address]
   - Associated Member: [Name]
   - Notes: [Any notes - be careful with sensitive info]"

User: "What account is associated with John Smith?"
Assistant:
1. First use search_members to find John Smith's ID
2. Call get_account_details with member_id
3. Show account details for John Smith's account

User: "Tell me more about this account" (after search results)
Assistant:
1. Use account ID from previous context
2. Call get_account_details with account_id
3. Show complete details

**Important Notes:**
- Handle sensitive information carefully (tax IDs, private notes)
- Present information in a structured, easy-to-read format
- Always show account status (active/inactive)
- Display member association if available
- Offer to help with updates if needed (use manage_account tool)
    `.trim();
  }
}
