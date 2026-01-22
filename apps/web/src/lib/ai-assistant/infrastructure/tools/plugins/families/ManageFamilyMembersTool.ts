/**
 * ManageFamilyMembersTool
 * Manages family membership operations using GraphQL mutations
 *
 * Features:
 * - Add member to family with role assignment
 * - Remove member from family
 * - Update member's role within family
 * - Set primary family for a member
 * - Uses GraphQL mutations with cache invalidation
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, FamilyMutations } from '@/lib/graphql/client';

export interface ManageFamilyMembersInput {
  operation: 'add' | 'remove' | 'update_role' | 'set_primary';
  family_id: string;
  member_id: string;
  role?: 'head' | 'spouse' | 'child' | 'dependent' | 'other';
  role_notes?: string;
  is_primary?: boolean;
}

export class ManageFamilyMembersTool extends BaseTool {
  readonly name = 'manage_family_members';
  readonly description =
    'Manages family membership operations: add member to family, remove member, update role, or set primary family. ' +
    'Use this when the user wants to link a member to a family, unlink a member, change their role (head, spouse, child, dependent, other), ' +
    'or designate a family as a member\'s primary family.';

  getCategory(): string {
    return 'Family Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Add John Smith to the Johnson family as a child',
      'Remove Mary from this family',
      'Make this family the primary family for John',
      'Change Sarah\'s role to spouse in the Brown family',
      'Link this member to this family as head',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'remove', 'update_role', 'set_primary'],
          description: 'The operation to perform: add (add member to family), remove (remove member from family), update_role (change member role), set_primary (set as primary family)',
        },
        family_id: {
          type: 'string',
          description: 'The unique ID of the family',
        },
        member_id: {
          type: 'string',
          description: 'The unique ID of the member',
        },
        role: {
          type: 'string',
          enum: ['head', 'spouse', 'child', 'dependent', 'other'],
          description: 'The role of the member in the family (required for add and update_role operations)',
        },
        role_notes: {
          type: 'string',
          description: 'Additional notes about the member\'s role (optional, used with add or update_role)',
        },
        is_primary: {
          type: 'boolean',
          description: 'Whether this is the member\'s primary family (optional, used with add operation)',
        },
      },
      required: ['operation', 'family_id', 'member_id'],
    };
  }

  async execute(input: ManageFamilyMembersInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[ManageFamilyMembersTool] Operation: ${input.operation}, familyId=${input.family_id}, memberId=${input.member_id}`);

      let result: any;
      let message: string;

      switch (input.operation) {
        case 'add':
          if (!input.role) {
            return this.error('Role is required when adding a member to a family');
          }

          result = await graphqlQuery<{ addMemberToFamily: any }>(FamilyMutations.ADD_MEMBER_TO_FAMILY, {
            input: {
              family_id: input.family_id,
              member_id: input.member_id,
              role: input.role,
              role_notes: input.role_notes,
              is_primary: input.is_primary,
            },
          });

          message = `Added ${result.addMemberToFamily.member.first_name} ${result.addMemberToFamily.member.last_name} to ${result.addMemberToFamily.family.name} as ${input.role}`;

          if (input.is_primary) {
            message += ' (set as primary family)';
          }

          console.log(`[ManageFamilyMembersTool] ${message}`);

          return this.success({
            operation: 'add',
            family_member: {
              id: result.addMemberToFamily.id,
              family_id: result.addMemberToFamily.family.id,
              family_name: result.addMemberToFamily.family.name,
              member_id: result.addMemberToFamily.member.id,
              member_name: `${result.addMemberToFamily.member.first_name} ${result.addMemberToFamily.member.last_name}`,
              role: result.addMemberToFamily.role,
              role_notes: result.addMemberToFamily.role_notes || null,
              is_primary: result.addMemberToFamily.is_primary,
              joined_at: result.addMemberToFamily.joined_at,
            },
            message,
          });

        case 'remove':
          result = await graphqlQuery<{ removeMemberFromFamily: boolean }>(FamilyMutations.REMOVE_MEMBER_FROM_FAMILY, {
            familyId: input.family_id,
            memberId: input.member_id,
          });

          message = `Removed member from family`;
          console.log(`[ManageFamilyMembersTool] ${message}`);

          return this.success({
            operation: 'remove',
            success: result.removeMemberFromFamily,
            message,
          });

        case 'update_role':
          if (!input.role) {
            return this.error('Role is required when updating a member\'s role');
          }

          result = await graphqlQuery<{ updateMemberRole: any }>(FamilyMutations.UPDATE_MEMBER_ROLE, {
            familyId: input.family_id,
            memberId: input.member_id,
            role: input.role,
          });

          message = `Updated member role to ${input.role}`;
          console.log(`[ManageFamilyMembersTool] ${message}`);

          return this.success({
            operation: 'update_role',
            family_member: {
              id: result.updateMemberRole.id,
              role: result.updateMemberRole.role,
              role_notes: result.updateMemberRole.role_notes || null,
              updated_at: result.updateMemberRole.updated_at,
            },
            message,
          });

        case 'set_primary':
          result = await graphqlQuery<{ setPrimaryFamily: boolean }>(FamilyMutations.SET_PRIMARY_FAMILY, {
            memberId: input.member_id,
            familyId: input.family_id,
          });

          message = `Set family as member's primary family`;
          console.log(`[ManageFamilyMembersTool] ${message}`);

          return this.success({
            operation: 'set_primary',
            success: result.setPrimaryFamily,
            message,
          });

        default:
          return this.error(`Unknown operation: ${input.operation}`);
      }
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to ${input.operation} family member: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: ManageFamilyMembersInput): string {
    switch (input.operation) {
      case 'add':
        return `Adding member to family...`;
      case 'remove':
        return `Removing member from family...`;
      case 'update_role':
        return `Updating member role...`;
      case 'set_primary':
        return `Setting primary family...`;
      default:
        return `Managing family member...`;
    }
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
MANAGE FAMILY MEMBERS TOOL - Usage Instructions:

**When to Use:**
- User wants to add a member to a family
- User wants to remove a member from a family
- User wants to change a member's role within a family
- User wants to set a family as a member's primary family

**Operations:**
1. **add**: Add a member to a family with a specific role
   - Required: family_id, member_id, role
   - Optional: role_notes, is_primary
   - Roles: head, spouse, child, dependent, other

2. **remove**: Remove a member from a family
   - Required: family_id, member_id
   - Soft deletion - preserves historical record

3. **update_role**: Change a member's role within a family
   - Required: family_id, member_id, role
   - Useful when family structure changes (e.g., child becomes head)

4. **set_primary**: Designate a family as a member's primary family
   - Required: family_id, member_id
   - Automatically demotes any existing primary family

**Usage Tips:**
- Always confirm the member and family IDs before performing operations
- When adding a member, choose the appropriate role:
  - head: Head of household
  - spouse: Married partner of head
  - child: Children of head/spouse
  - dependent: Other dependents (elderly parents, etc.)
  - other: Other relationships
- A member can belong to multiple families but only ONE primary family
- Removing a member is a soft deletion - data is preserved

**Example Workflows:**

User: "Add John Smith to the Johnson family as a child"
Assistant:
1. Use search_members to find John Smith's ID
2. Use search_families to find Johnson family ID
3. Call manage_family_members with operation="add", role="child"
4. Respond: "I've added John Smith to the Johnson family as a child."

User: "Make this family John's primary family"
Assistant:
1. Call manage_family_members with operation="set_primary"
2. Respond: "I've set this family as John's primary family."

User: "Remove Mary from the Brown family"
Assistant:
1. Find member and family IDs
2. Call manage_family_members with operation="remove"
3. Respond: "I've removed Mary from the Brown family."

User: "Change Sarah's role to spouse in this family"
Assistant:
1. Call manage_family_members with operation="update_role", role="spouse"
2. Respond: "I've updated Sarah's role to spouse in this family."

**Important Notes:**
- ALWAYS get user confirmation before removing members from families
- When adding members, suggest whether it should be their primary family
- Explain role options if user is unsure
- After operations, consider showing updated family details
    `.trim();
  }
}
