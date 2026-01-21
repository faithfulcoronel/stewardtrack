/**
 * GetMemberDetailsTool
 * Retrieves detailed information about a specific member
 *
 * Features:
 * - Get member by ID, name, or email
 * - Returns comprehensive member information
 * - Includes birthday, anniversary, contact info, etc.
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';

export interface GetMemberDetailsInput {
  member_id?: string;
  name?: string;
  email?: string;
}

export class GetMemberDetailsTool extends BaseTool {
  readonly name = 'get_member_details';
  readonly description =
    'Retrieves detailed information about a specific church member. ' +
    'Can search by member ID, name, or email. Use this when the user asks about a specific member, ' +
    'their birthday, anniversary, contact information, or other personal details.';

  getCategory(): string {
    return 'Member Tools';
  }

  getSamplePrompts(): string[] {
    return [
      "What is John Smith's birthday?",
      "When is Mary Johnson's anniversary?",
      "Show me details for member ID 12345",
      "Find information about sarah@example.com",
      "What is John's phone number?",
      "Tell me about member John Doe",
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        member_id: {
          type: 'string',
          description: 'The unique ID of the member',
        },
        name: {
          type: 'string',
          description: 'The full name or partial name of the member (e.g., "John Smith" or "John")',
        },
        email: {
          type: 'string',
          description: 'The email address of the member',
        },
      },
      required: [],
    };
  }

  async execute(input: GetMemberDetailsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      // Validate that at least one search criteria is provided
      if (!input.member_id && !input.name && !input.email) {
        return this.error('Please provide at least one search criteria: member_id, name, or email');
      }

      // Get member repository
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);

      let member = null;

      // Search by ID first (most specific)
      if (input.member_id) {
        const result = await memberRepo.findById(input.member_id);
        if (result) {
          member = result;
        }
      }

      // Search by email if not found by ID
      if (!member && input.email) {
        const result = await memberRepo.findAll();
        if (result.success && result.data) {
          member = result.data.find(m =>
            m.email?.toLowerCase() === input.email?.toLowerCase()
          );
        }
      }

      // Search by name if not found by ID or email
      if (!member && input.name) {
        const result = await memberRepo.findAll();
        if (result.success && result.data) {
          const searchName = input.name.toLowerCase();
          member = result.data.find(m => {
            const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
            const firstName = m.first_name?.toLowerCase() || '';
            const lastName = m.last_name?.toLowerCase() || '';
            return fullName.includes(searchName) || firstName.includes(searchName) || lastName.includes(searchName);
          });
        }
      }

      if (!member) {
        const searchCriteria = input.member_id || input.email || input.name;
        return this.error(`Member not found with criteria: ${searchCriteria}`);
      }

      // Format the response with key information
      const memberInfo: any = {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        preferred_name: member.preferred_name || null,
        email: member.email || null,
        contact_number: member.contact_number || null,
        birthday: member.birthday || null,
        anniversary: member.anniversary || null,
        gender: member.gender,
        marital_status: member.marital_status,
        occupation: member.occupation || null,
      };

      // Add address if available
      if (member.address_street || member.address_city) {
        memberInfo.address = {
          street: member.address_street || null,
          street2: member.address_street2 || null,
          city: member.address_city || null,
          state: member.address_state || null,
          postal_code: member.address_postal_code || null,
        };
      }

      // Add emergency contact if available
      if (member.emergency_contact_name) {
        memberInfo.emergency_contact = {
          name: member.emergency_contact_name,
          phone: member.emergency_contact_phone || null,
          relationship: member.emergency_contact_relationship || null,
        };
      }

      // Calculate age if birthday is available
      if (member.birthday) {
        const birthDate = new Date(member.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        memberInfo.age = age;
      }

      // Calculate days until birthday
      if (member.birthday) {
        const birthDate = new Date(member.birthday);
        const today = new Date();
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }

        const daysUntilBirthday = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        memberInfo.days_until_birthday = daysUntilBirthday;
      }

      // Calculate days until anniversary
      if (member.anniversary) {
        const anniversaryDate = new Date(member.anniversary);
        const today = new Date();
        const thisYearAnniversary = new Date(today.getFullYear(), anniversaryDate.getMonth(), anniversaryDate.getDate());

        if (thisYearAnniversary < today) {
          thisYearAnniversary.setFullYear(today.getFullYear() + 1);
        }

        const daysUntilAnniversary = Math.ceil((thisYearAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        memberInfo.days_until_anniversary = daysUntilAnniversary;
      }

      this.logSuccess(Date.now() - startTime);

      return this.success({
        member: memberInfo,
        message: `Found member: ${memberInfo.name}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get member details: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: GetMemberDetailsInput): string {
    const criteria = input.member_id || input.email || input.name || 'member';
    return `Retrieving details for ${criteria}...`;
  }

  /**
   * Generate UI components to display member details
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.member) {
      return null;
    }

    return [
      {
        type: 'MemberDetailCard',
        props: result.data.member,
      },
    ];
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET MEMBER DETAILS TOOL - Usage Instructions:

**When to Use:**
- User asks about a specific member
- User wants to know someone's birthday, anniversary, or contact info
- User asks "When is [name]'s birthday/anniversary?"
- User needs member information for any reason

**Search Options:**
Can search by:
- member_id: Most accurate, use if you have the ID
- email: Good for exact matches
- name: Searches first name, last name, or full name

**Information Returned:**
- Full name and preferred name
- Email and phone number
- Birthday and age (if available)
- Days until next birthday
- Anniversary and days until next anniversary (for married members)
- Gender and marital status
- Address information
- Emergency contact information
- Occupation

**Usage Tips:**
- For birthday questions: Use this tool and report the birthday and days until next birthday
- For anniversary questions: Use this tool and report the anniversary and days until next anniversary
- Present information in a friendly, conversational way
- Respect privacy - only share information the user is authorized to see
- If multiple members match a name search, list them and ask user to clarify

**Example Responses:**
User: "When is John Smith's birthday?"
Assistant:
1. Calls get_member_details with name="John Smith"
2. Responds: "John Smith's birthday is May 15, 1990 (age 33). His birthday is in 45 days!"

User: "What is Sarah's anniversary?"
Assistant:
1. Calls get_member_details with name="Sarah"
2. Responds: "Sarah Johnson's anniversary is June 20, 2015. Their anniversary is in 120 days!"
    `.trim();
  }
}
