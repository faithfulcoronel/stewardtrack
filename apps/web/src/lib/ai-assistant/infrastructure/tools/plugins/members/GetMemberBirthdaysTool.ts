/**
 * GetMemberBirthdaysTool
 * Retrieves upcoming member birthdays using GraphQL
 *
 * Features:
 * - Get birthdays for current month or specific month
 * - Returns sorted list by date
 * - Shows days until birthday
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, MemberQueries } from '@/lib/graphql/client';

export interface GetMemberBirthdaysInput {
  month?: number; // 1-12, defaults to current month
}

export class GetMemberBirthdaysTool extends BaseTool {
  readonly name = 'get_member_birthdays';
  readonly description =
    'Retrieves member birthdays for the current month or a specific month. ' +
    'Use this when the user asks about upcoming birthdays, who has a birthday this month, ' +
    'or birthdays in a specific month.';

  getCategory(): string {
    return 'Member Tools';
  }

  getSamplePrompts(): string[] {
    return [
      "Who has a birthday this month?",
      "Show me upcoming birthdays",
      "List birthdays for July",
      "Who has a birthday in December?",
      "What birthdays are coming up?",
    ];
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

  async execute(input: GetMemberBirthdaysInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      // Determine which month to query
      const today = new Date();
      const targetMonth = input.month && input.month >= 1 && input.month <= 12
        ? input.month
        : today.getMonth() + 1; // getMonth() returns 0-11

      console.log(`[GetMemberBirthdaysTool] Using GraphQL query for month=${targetMonth}`);

      // Use GraphQL getMemberBirthdays query (with caching)
      const result = await graphqlQuery<{ getMemberBirthdays: any[] }>(MemberQueries.GET_MEMBER_BIRTHDAYS, {
        month: input.month, // Pass undefined for current month
      });

      const members = result.getMemberBirthdays;

      console.log(`[GetMemberBirthdaysTool] Found ${members.length} birthdays via GraphQL`);

      if (!members || members.length === 0) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        return this.success({
          birthdays: [],
          total: 0,
          month: targetMonth,
          month_name: monthNames[targetMonth - 1],
          message: `No birthdays found for ${monthNames[targetMonth - 1]}`,
        });
      }

      // Format birthday data
      const formattedBirthdays = members.map(m => {
        const birthDate = new Date(m.birthday!);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

        // If birthday already passed this year, calculate for next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }

        // Calculate days until birthday
        const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate age (will be on this birthday)
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        const turningAge = age + 1;

        return {
          member_id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          preferred_name: m.preferred_name || null,
          birthday: m.birthday,
          birth_month: birthDate.getMonth() + 1,
          birth_day: birthDate.getDate(),
          days_until: daysUntil,
          turning_age: turningAge,
          email: m.email || null,
          contact_number: m.contact_number || null,
        };
      });

      // Sort by day of month
      formattedBirthdays.sort((a, b) => a.birth_day - b.birth_day);

      // Get month name
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

      this.logSuccess(Date.now() - startTime);

      return this.success({
        birthdays: formattedBirthdays,
        total: formattedBirthdays.length,
        month: targetMonth,
        month_name: monthNames[targetMonth - 1],
        message: `Found ${formattedBirthdays.length} birthday(s) in ${monthNames[targetMonth - 1]}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get birthdays: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: GetMemberBirthdaysInput): string {
    if (input.month) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return `Retrieving birthdays for ${monthNames[input.month - 1]}...`;
    }
    return 'Retrieving upcoming birthdays...';
  }

  /**
   * Generate UI components to display birthdays
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.birthdays) {
      return null;
    }

    return [
      {
        type: 'BirthdayList',
        props: {
          birthdays: result.data.birthdays,
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
GET MEMBER BIRTHDAYS TOOL - Usage Instructions:

**When to Use:**
- User asks about upcoming birthdays
- User wants to know who has a birthday this month
- User asks for birthdays in a specific month
- User wants to plan birthday celebrations

**Parameters:**
- month: Optional month number (1-12)
  - Defaults to current month if not specified
  - Use 1 for January, 2 for February, etc.

**Information Returned:**
For each birthday:
- Member name and preferred name
- Birthday date
- Days until birthday
- Age they're turning
- Contact information (email, phone)

**Usage Tips:**
- Present birthdays in chronological order (sorted by day)
- Highlight birthdays that are very soon (within 7 days)
- Include age information when appropriate
- Group birthdays by week for better readability
- Suggest birthday celebration opportunities

**Example Responses:**
User: "Who has a birthday this month?"
Assistant:
1. Calls get_member_birthdays (no month parameter)
2. Responds: "Here are the birthdays for January:
   - John Smith (Jan 5) - turning 45 in 3 days
   - Mary Johnson (Jan 12) - turning 32 in 10 days
   - Bob Wilson (Jan 28) - turning 67 in 26 days

   Would you like me to help plan any birthday celebrations?"

User: "Show me birthdays for July"
Assistant:
1. Calls get_member_birthdays with month=7
2. Responds: "I found 8 birthdays in July: [list with dates and ages]"

User: "Whose birthday is coming up soon?"
Assistant:
1. Calls get_member_birthdays (current month)
2. Filters to show only birthdays within next 7-14 days
3. Responds with upcoming birthdays
    `.trim();
  }
}
