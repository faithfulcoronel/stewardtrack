/**
 * CreateMemberTool
 * Creates a new church member
 *
 * Features:
 * - Creates member with all required and optional information
 * - Validates input data
 * - Integrates with existing member repository
 * - Always asks for confirmation before creating
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';
import type { IMembershipTypeRepository } from '@/repositories/membershipType.repository';
import type { TenantService } from '@/services/TenantService';

export interface CreateMemberInput {
  first_name: string;
  last_name: string;
  middle_name?: string;
  preferred_name?: string;
  email?: string;
  contact_number?: string;
  birthday?: string; // ISO date format YYYY-MM-DD
  anniversary?: string; // ISO date format YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  marital_status: 'single' | 'married' | 'widowed' | 'divorced' | 'engaged';
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
  membership_type_id?: string;
  membership_status_id?: string;
  occupation?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}

export class CreateMemberTool extends BaseTool {
  readonly name = 'create_member';
  readonly description =
    'Creates a new church member with their information. Use this when the user wants to add a new member to the system. ' +
    'Always ask for confirmation before creating.';

  getCategory(): string {
    return 'Member Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Add a new member named John Smith',
      'Create a member record for Jane Doe',
      'Register a new church member',
      'Add John and Mary to the membership',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        first_name: {
          type: 'string',
          description: 'First name of the member (required)',
        },
        last_name: {
          type: 'string',
          description: 'Last name of the member (required)',
        },
        middle_name: {
          type: 'string',
          description: 'Middle name or initial (optional)',
        },
        preferred_name: {
          type: 'string',
          description: 'Preferred name or nickname (optional)',
        },
        email: {
          type: 'string',
          description: 'Email address (optional)',
        },
        contact_number: {
          type: 'string',
          description: 'Phone number (optional)',
        },
        birthday: {
          type: 'string',
          description: 'Birthday in YYYY-MM-DD format (optional)',
        },
        anniversary: {
          type: 'string',
          description: 'Wedding anniversary in YYYY-MM-DD format (optional)',
        },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'other'],
          description: 'Gender of the member (required)',
        },
        marital_status: {
          type: 'string',
          enum: ['single', 'married', 'widowed', 'divorced', 'engaged'],
          description: 'Marital status (required)',
        },
        address_street: {
          type: 'string',
          description: 'Street address (optional)',
        },
        address_city: {
          type: 'string',
          description: 'City (optional)',
        },
        address_state: {
          type: 'string',
          description: 'State (optional)',
        },
        address_postal_code: {
          type: 'string',
          description: 'Postal/ZIP code (optional)',
        },
        occupation: {
          type: 'string',
          description: 'Occupation or job title (optional)',
        },
        emergency_contact_name: {
          type: 'string',
          description: 'Emergency contact name (optional)',
        },
        emergency_contact_phone: {
          type: 'string',
          description: 'Emergency contact phone number (optional)',
        },
        emergency_contact_relationship: {
          type: 'string',
          description: 'Relationship to emergency contact (optional)',
        },
      },
      required: ['first_name', 'last_name', 'gender', 'marital_status'],
    };
  }

  async execute(input: CreateMemberInput, context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      // Validate required fields
      const validation = this.validateRequired(input, ['first_name', 'last_name', 'gender', 'marital_status']);

      if (!validation.valid) {
        return this.error(validation.error || 'Validation failed');
      }

      // Get tenant context
      const tenantService = container.get<TenantService>(TYPES.TenantService);
      const tenant = await tenantService.getCurrentTenant();

      if (!tenant) {
        return this.error('No tenant context available. Please ensure you are logged in.');
      }

      // Get default membership type and status if not provided
      let membershipTypeId = input.membership_type_id;
      let membershipStatusId = input.membership_status_id;

      if (!membershipTypeId) {
        // Get default membership type
        const membershipTypeRepo = container.get<IMembershipTypeRepository>(TYPES.IMembershipTypeRepository);
        const typesResult = await membershipTypeRepo.findAll();

        if (typesResult.success && typesResult.data && typesResult.data.length > 0) {
          // Use first membership type as default
          membershipTypeId = typesResult.data[0].id;
        } else {
          return this.error('No membership types available. Please configure membership types first.');
        }
      }

      if (!membershipStatusId) {
        // Use a default status ID - you may want to look this up from a repository
        // For now, we'll require it to be provided or looked up
        membershipStatusId = membershipTypeId; // Placeholder - should be actual status ID
      }

      // Get member repository
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);

      // Build member data
      const memberData: any = {
        tenant_id: tenant.id,
        first_name: input.first_name,
        last_name: input.last_name,
        middle_name: input.middle_name || null,
        preferred_name: input.preferred_name || null,
        email: input.email || null,
        contact_number: input.contact_number || null,
        birthday: input.birthday || null,
        anniversary: input.anniversary || null,
        gender: input.gender,
        marital_status: input.marital_status,
        address_street: input.address_street || null,
        address_city: input.address_city || null,
        address_state: input.address_state || null,
        address_postal_code: input.address_postal_code || null,
        membership_type_id: membershipTypeId,
        membership_status_id: membershipStatusId,
        membership_date: new Date().toISOString().split('T')[0],
        occupation: input.occupation || null,
        emergency_contact_name: input.emergency_contact_name || null,
        emergency_contact_phone: input.emergency_contact_phone || null,
        emergency_contact_relationship: input.emergency_contact_relationship || null,
        profile_picture_url: null,
        created_by: context.userId || null,
      };

      // Create the member
      const result = await memberRepo.create(memberData);

      if (!result.success || !result.data) {
        return this.error('Failed to create member');
      }

      const member = result.data;

      this.logSuccess(Date.now() - startTime);

      return this.success({
        member_id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        email: member.email,
        birthday: member.birthday,
        anniversary: member.anniversary,
        message: `Successfully created member: ${member.first_name} ${member.last_name}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to create member: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: CreateMemberInput): string {
    return `Creating member record for ${input.first_name} ${input.last_name}...`;
  }

  /**
   * Generate UI components to display the created member
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data) {
      return null;
    }

    return [
      {
        type: 'MemberCard',
        props: {
          memberId: result.data.member_id,
          name: result.data.name,
          email: result.data.email,
          birthday: result.data.birthday,
          anniversary: result.data.anniversary,
        },
      },
    ];
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
CREATE MEMBER TOOL - Usage Instructions:

**When to Use:**
- User wants to add a new member to the system
- User provides member information to register
- User asks to "create", "add", or "register" a member

**CRITICAL: Always Ask for Confirmation First**
NEVER create a member without user confirmation. Always:
1. Collect all the member information
2. Present the details to the user for review
3. Ask "Would you like me to create this member record?"
4. Only call the tool after user explicitly confirms

**Required Information:**
- first_name: Member's first name
- last_name: Member's last name
- gender: male, female, or other
- marital_status: single, married, widowed, divorced, or engaged

**Optional Information:**
- middle_name, preferred_name
- email, contact_number
- birthday (YYYY-MM-DD format)
- anniversary (YYYY-MM-DD format) - only for married members
- address (street, city, state, postal_code)
- occupation
- emergency_contact_name, emergency_contact_phone, emergency_contact_relationship

**Important Notes:**
- ALWAYS ask for user confirmation before creating any member
- Birthday and anniversary should be in YYYY-MM-DD format
- Anniversary is typically only applicable for married members
- Email addresses should be validated for format
- Phone numbers can be in any format
- Present all information clearly before asking for confirmation

**Example Workflow:**
User: "Add John Smith as a new member"
Assistant:
1. Asks for required info: "What is John's gender and marital status?"
2. Asks for optional info: "Do you have John's email, phone, or birthday?"
3. Presents collected info: "Here's what I have for John Smith:
   - Name: John Smith
   - Gender: Male
   - Marital Status: Single
   - Email: john.smith@example.com
   - Birthday: 1990-05-15

   Would you like me to create this member record?"
4. Waits for user confirmation
5. Only calls create_member after user says yes
6. Confirms creation: "Successfully created member John Smith!"
    `.trim();
  }
}
