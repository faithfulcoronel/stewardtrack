/**
 * GetFamilyDetailsTool
 * Retrieves detailed information about a specific family using GraphQL
 *
 * Features:
 * - Get family by ID
 * - Returns complete family information including all members
 * - Shows member roles, contact info, and primary family status
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, FamilyQueries } from '@/lib/graphql/client';

export interface GetFamilyDetailsInput {
  family_id: string;
}

export class GetFamilyDetailsTool extends BaseTool {
  readonly name = 'get_family_details';
  readonly description =
    'Retrieves detailed information about a specific family by ID. ' +
    'Returns family name, address, notes, and a complete list of all family members with their roles. ' +
    'Use this when the user asks for details about a specific family or wants to see all members of a family.';

  getCategory(): string {
    return 'Family Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me details about the Smith family',
      'Get information about family ID abc123',
      'Who are the members of the Johnson family?',
      'Show me all details for this family',
      'What is the address of the Brown family?',
    ];
  }

  /**
   * Required permission for viewing family details
   */
  protected getRequiredPermissions(): string[] {
    return ['households:view'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        family_id: {
          type: 'string',
          description: 'The unique ID of the family to retrieve',
        },
      },
      required: ['family_id'],
    };
  }

  async execute(input: GetFamilyDetailsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[GetFamilyDetailsTool] Using GraphQL query with familyId="${input.family_id}"`);

      // Use GraphQL getFamily query
      const result = await graphqlQuery<{ getFamily: any }>(FamilyQueries.GET_FAMILY, {
        id: input.family_id,
      });

      const family = result.getFamily;

      if (!family) {
        console.log(`[GetFamilyDetailsTool] Family not found`);
        return this.error(`Family with ID "${input.family_id}" not found`);
      }

      console.log(`[GetFamilyDetailsTool] Found family with ${family.members?.length || 0} members`);

      // Format family data
      const formattedFamily = {
        id: family.id,
        name: family.name,
        formal_name: family.formal_name || null,
        address: {
          street: family.address_street || null,
          street2: family.address_street2 || null,
          city: family.address_city || null,
          state: family.address_state || null,
          postal_code: family.address_postal_code || null,
          country: family.address_country || null,
          full_address: [
            family.address_street,
            family.address_street2,
            family.address_city,
            family.address_state,
            family.address_postal_code,
            family.address_country,
          ].filter(Boolean).join(', ') || null,
        },
        family_photo_url: family.family_photo_url || null,
        notes: family.notes || null,
        tags: family.tags || [],
        member_count: family.member_count || 0,
        head: family.head?.member ? {
          name: `${family.head.member.first_name} ${family.head.member.last_name}`,
          email: family.head.member.email || null,
          contact_number: family.head.member.contact_number || null,
        } : null,
        members: (family.members || []).map((fm: any) => ({
          member_id: fm.member.id,
          name: `${fm.member.first_name} ${fm.member.last_name}`,
          preferred_name: fm.member.preferred_name || null,
          email: fm.member.email || null,
          contact_number: fm.member.contact_number || null,
          role: fm.role,
          role_notes: fm.role_notes || null,
          is_primary: fm.is_primary,
          joined_at: fm.joined_at || null,
          profile_picture_url: fm.member.profile_picture_url || null,
        })),
        created_at: family.created_at,
        updated_at: family.updated_at,
      };

      this.logSuccess(Date.now() - startTime);

      return this.success({
        family: formattedFamily,
        message: `Retrieved details for family "${family.name}" with ${formattedFamily.member_count} member(s)`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get family details: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: GetFamilyDetailsInput): string {
    return `Retrieving family details...`;
  }

  /**
   * Generate UI components to display family details
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.family) {
      return null;
    }

    return [
      {
        type: 'FamilyDetailCard',
        props: {
          family: result.data.family,
        },
      },
    ];
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET FAMILY DETAILS TOOL - Usage Instructions:

**When to Use:**
- User asks for detailed information about a specific family
- User wants to see all members of a family
- User asks for family address, notes, or other details
- User needs to know family member roles and relationships

**Required Parameters:**
- family_id: The unique ID of the family (required)

**Information Returned:**
- Family name and formal name
- Complete address (street, city, state, postal code, country)
- Family photo URL
- Internal notes
- Tags
- Member count
- Head of family info
- Complete list of all family members with:
  - Name and preferred name
  - Email and contact number
  - Role in family (head, spouse, child, dependent, other)
  - Role notes
  - Primary family status
  - Date joined family
  - Profile picture URL

**Usage Tips:**
- Present family information in a structured format
- Clearly indicate the head of family
- Show member roles and primary family status
- Include contact information for easy communication
- Note if family has no members
- Mention family notes if they exist

**Example Responses:**
User: "Show me details about the Smith family"
Assistant:
1. First use search_families to find the Smith family ID
2. Then calls get_family_details with the family ID
3. Responds: "Here are the details for the Smith Family:

   **Family Information:**
   - Name: Smith Family
   - Formal Name: The Smith Family
   - Address: 123 Main St, Manila, Metro Manila, 1000, Philippines
   - Members: 4

   **Head of Family:**
   - John Smith (john@example.com)

   **Family Members:**
   1. John Smith (Head) - Primary family
   2. Mary Smith (Spouse) - Primary family
   3. Sarah Smith (Child)
   4. Tom Smith (Child)

   **Notes:** Active family, attends Sunday service regularly"

User: "Who are the members of this family?"
Assistant:
1. Calls get_family_details
2. Lists all members with their roles and contact information

User: "What is the address of this family?"
Assistant:
1. Calls get_family_details
2. Responds with the complete address from the family record
    `.trim();
  }
}
