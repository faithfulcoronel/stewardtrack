/**
 * GetMemberAnniversariesTool
 * Retrieves upcoming member anniversaries (wedding anniversaries) using GraphQL
 *
 * Features:
 * - Get anniversaries for current month or specific month
 * - Returns sorted list by date
 * - Shows days until anniversary and years married
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, MemberQueries } from '@/lib/graphql/client';

export interface GetMemberAnniversariesInput {
  month?: number; // 1-12, defaults to current month
}

export class GetMemberAnniversariesTool extends BaseTool {
  readonly name = 'get_member_anniversaries';
  readonly description =
    'Retrieves member wedding anniversaries for the current month or a specific month. ' +
    'Use this when the user asks about upcoming anniversaries, who has an anniversary this month, ' +
    'or anniversaries in a specific month.';

  getCategory(): string {
    return 'Member Tools';
  }

  getSamplePrompts(): string[] {
    return [
      "Who has an anniversary this month?",
      "Show me upcoming anniversaries",
      "List anniversaries for June",
      "Who has a wedding anniversary in December?",
      "What anniversaries are coming up?",
    ];
  }

  /**
   * Required permission for viewing member anniversaries
   */
  protected getRequiredPermissions(): string[] {
    return ['members:view'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        month: {
          type: 'number',
          description: 'Month number (1-12). Defaults to current month if not specified.',
          minimum: 1,
          maximum: 12,
        },
      },
      required: [],
    };
  }

  async execute(input: GetMemberAnniversariesInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[GetMemberAnniversariesTool] Using GraphQL query with month=${input.month || 'current'}`);

      // Use GraphQL getMemberAnniversaries query (with caching)
      const result = await graphqlQuery<{ getMemberAnniversaries: any[] }>(MemberQueries.GET_MEMBER_ANNIVERSARIES, {
        month: input.month,
      });

      const members = result.getMemberAnniversaries;

      console.log(`[GetMemberAnniversariesTool] Found ${members.length} members via GraphQL`);

      // Determine which month we queried
      const today = new Date();
      const targetMonth = input.month && input.month >= 1 && input.month <= 12
        ? input.month
        : today.getMonth() + 1;

      if (members.length === 0) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        return this.success({
          anniversaries: [],
          total: 0,
          month: targetMonth,
          month_name: monthNames[targetMonth - 1],
          message: `No anniversaries found for ${monthNames[targetMonth - 1]}`,
        });
      }

      // Format anniversary data
      const formattedAnniversaries = members.map(m => {
        const anniversaryDate = new Date(m.anniversary!);
        const thisYearAnniversary = new Date(today.getFullYear(), anniversaryDate.getMonth(), anniversaryDate.getDate());

        // If anniversary already passed this year, calculate for next year
        if (thisYearAnniversary < today) {
          thisYearAnniversary.setFullYear(today.getFullYear() + 1);
        }

        // Calculate days until anniversary
        const daysUntil = Math.ceil((thisYearAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate years married
        let yearsMarried = today.getFullYear() - anniversaryDate.getFullYear();
        const monthDiff = today.getMonth() - anniversaryDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < anniversaryDate.getDate())) {
          yearsMarried--;
        }
        const celebratingYears = yearsMarried + 1;

        return {
          member_id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          preferred_name: m.preferred_name || null,
          anniversary: m.anniversary,
          anniversary_month: anniversaryDate.getMonth() + 1,
          anniversary_day: anniversaryDate.getDate(),
          days_until: daysUntil,
          years_married: celebratingYears,
          email: m.email || null,
          contact_number: m.contact_number || null,
        };
      });

      // Sort by day of month
      formattedAnniversaries.sort((a, b) => a.anniversary_day - b.anniversary_day);

      // Get month name
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

      this.logSuccess(Date.now() - startTime);

      return this.success({
        anniversaries: formattedAnniversaries,
        total: formattedAnniversaries.length,
        month: targetMonth,
        month_name: monthNames[targetMonth - 1],
        message: `Found ${formattedAnniversaries.length} anniversar${formattedAnniversaries.length === 1 ? 'y' : 'ies'} in ${monthNames[targetMonth - 1]}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get anniversaries: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: GetMemberAnniversariesInput): string {
    if (input.month) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return `Retrieving anniversaries for ${monthNames[input.month - 1]}...`;
    }
    return 'Retrieving upcoming anniversaries...';
  }

  /**
   * Generate UI components to display anniversaries
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.anniversaries) {
      return null;
    }

    return [
      {
        type: 'AnniversaryList',
        props: {
          anniversaries: result.data.anniversaries,
          total: result.data.total,
          month: result.data.month_name,
        },
      },
    ];
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET MEMBER ANNIVERSARIES TOOL - Usage Instructions:

**When to Use:**
- User asks about upcoming anniversaries
- User wants to know who has an anniversary this month
- User asks for anniversaries in a specific month
- User wants to plan anniversary celebrations

**Parameters:**
- month: Optional month number (1-12)
  - Defaults to current month if not specified
  - Use 1 for January, 2 for February, etc.

**Information Returned:**
For each anniversary:
- Member name and preferred name
- Anniversary date
- Days until anniversary
- Years married (celebrating)
- Contact information (email, phone)

**Usage Tips:**
- Present anniversaries in chronological order (sorted by day)
- Highlight milestone anniversaries (25th, 50th, etc.)
- Highlight anniversaries that are very soon (within 7 days)
- Include years married information
- Suggest anniversary celebration opportunities
- Note that only married members will have anniversaries

**Milestone Anniversaries:**
- 1 year: Paper anniversary
- 5 years: Wood anniversary
- 10 years: Tin/Aluminum anniversary
- 25 years: Silver anniversary
- 50 years: Golden anniversary
- 60 years: Diamond anniversary

**Example Responses:**
User: "Who has an anniversary this month?"
Assistant:
1. Calls get_member_anniversaries (no month parameter)
2. Responds: "Here are the anniversaries for January:
   - John and Mary Smith (Jan 5) - celebrating 25 years in 3 days! (Silver anniversary)
   - Bob and Sue Wilson (Jan 15) - celebrating 10 years in 13 days
   - Tom and Lisa Brown (Jan 28) - celebrating 3 years in 26 days

   Would you like me to help plan any anniversary celebrations?"

User: "Show me anniversaries for June"
Assistant:
1. Calls get_member_anniversaries with month=6
2. Responds: "I found 5 anniversaries in June: [list with dates and years]"

User: "Whose anniversary is coming up soon?"
Assistant:
1. Calls get_member_anniversaries (current month)
2. Filters to show only anniversaries within next 7-14 days
3. Responds with upcoming anniversaries and years celebrating
    `.trim();
  }
}
