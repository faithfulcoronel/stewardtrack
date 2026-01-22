/**
 * ManageAccountTool
 * Manages account operations using GraphQL mutations
 *
 * Features:
 * - Create new account (organization or person)
 * - Update existing account details
 * - Activate account
 * - Deactivate account
 * - Delete account (soft delete)
 * - Uses GraphQL mutations with cache invalidation
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, AccountMutations } from '@/lib/graphql/client';

export interface ManageAccountInput {
  operation: 'create' | 'update' | 'activate' | 'deactivate' | 'delete';
  account_id?: string;
  name?: string;
  account_type?: 'organization' | 'person';
  account_number?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  tax_id?: string;
  is_active?: boolean;
  notes?: string;
  member_id?: string;
}

export class ManageAccountTool extends BaseTool {
  readonly name = 'manage_account';
  readonly description =
    'Manages account operations: create new account, update account details, activate account, deactivate account, or delete account. ' +
    'Use this when the user wants to create accounts for organizations or individuals, update account information, change account status, or manage account lifecycle.';

  getCategory(): string {
    return 'Account Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Create an account for ABC Company',
      'Update this account with new contact information',
      'Deactivate this account',
      'Activate the account for John Smith',
      'Delete this account',
      'Create a person account for member Jane Doe',
      'Update account email address',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        operation: {
          type: 'string',
          enum: ['create', 'update', 'activate', 'deactivate', 'delete'],
          description: 'The operation to perform: create (new account), update (modify account), activate (reactivate account), deactivate (mark as inactive), delete (remove account)',
        },
        account_id: {
          type: 'string',
          description: 'The unique ID of the account (required for update, activate, deactivate, delete operations)',
        },
        name: {
          type: 'string',
          description: 'Account name (required for create, optional for update)',
        },
        account_type: {
          type: 'string',
          enum: ['organization', 'person'],
          description: 'Account type: "organization" for businesses/entities or "person" for individuals (required for create)',
        },
        account_number: {
          type: 'string',
          description: 'Account number (optional, auto-generated if not provided for create)',
        },
        description: {
          type: 'string',
          description: 'Account description (optional, used with create or update)',
        },
        email: {
          type: 'string',
          description: 'Contact email address (optional, used with create or update)',
        },
        phone: {
          type: 'string',
          description: 'Contact phone number (optional, used with create or update)',
        },
        address: {
          type: 'string',
          description: 'Physical address (optional, used with create or update)',
        },
        website: {
          type: 'string',
          description: 'Website URL (optional, used with create or update)',
        },
        tax_id: {
          type: 'string',
          description: 'Tax ID / EIN / SSN (optional, SENSITIVE - handle with care, used with create or update)',
        },
        is_active: {
          type: 'boolean',
          description: 'Whether the account is active (optional, used with create or update)',
        },
        notes: {
          type: 'string',
          description: 'Internal notes about the account (optional, used with create or update)',
        },
        member_id: {
          type: 'string',
          description: 'Associated member ID (optional, links account to a member, used with create or update)',
        },
      },
      required: ['operation'],
    };
  }

  async execute(input: ManageAccountInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[ManageAccountTool] Operation: ${input.operation}, accountId=${input.account_id}, name=${input.name}`);

      let result: any;
      let message: string;

      switch (input.operation) {
        case 'create':
          if (!input.name || !input.account_type) {
            return this.error('name and account_type are required when creating an account');
          }

          result = await graphqlQuery<{ createAccount: any }>(AccountMutations.CREATE_ACCOUNT, {
            input: {
              name: input.name,
              account_type: input.account_type,
              account_number: input.account_number,
              description: input.description,
              email: input.email,
              phone: input.phone,
              address: input.address,
              website: input.website,
              tax_id: input.tax_id,
              is_active: input.is_active,
              notes: input.notes,
              member_id: input.member_id,
            },
          });

          message = `Created ${input.account_type} account: ${result.createAccount.name}`;

          if (input.member_id && result.createAccount.member) {
            message += `, linked to ${result.createAccount.member.first_name} ${result.createAccount.member.last_name}`;
          }

          console.log(`[ManageAccountTool] ${message}`);

          return this.success({
            operation: 'create',
            account: {
              id: result.createAccount.id,
              name: result.createAccount.name,
              account_type: result.createAccount.account_type,
              account_number: result.createAccount.account_number,
              description: result.createAccount.description || null,
              email: result.createAccount.email || null,
              phone: result.createAccount.phone || null,
              is_active: result.createAccount.is_active,
              member: result.createAccount.member ? {
                id: result.createAccount.member.id,
                name: `${result.createAccount.member.first_name} ${result.createAccount.member.last_name}`,
              } : null,
              created_at: result.createAccount.created_at,
            },
            message,
          });

        case 'update':
          if (!input.account_id) {
            return this.error('account_id is required when updating an account');
          }

          result = await graphqlQuery<{ updateAccount: any }>(AccountMutations.UPDATE_ACCOUNT, {
            id: input.account_id,
            input: {
              name: input.name,
              description: input.description,
              email: input.email,
              phone: input.phone,
              address: input.address,
              website: input.website,
              tax_id: input.tax_id,
              is_active: input.is_active,
              notes: input.notes,
              member_id: input.member_id,
            },
          });

          message = `Updated account: ${result.updateAccount.name}`;
          console.log(`[ManageAccountTool] ${message}`);

          return this.success({
            operation: 'update',
            account: {
              id: result.updateAccount.id,
              name: result.updateAccount.name,
              account_number: result.updateAccount.account_number,
              description: result.updateAccount.description || null,
              email: result.updateAccount.email || null,
              phone: result.updateAccount.phone || null,
              is_active: result.updateAccount.is_active,
              updated_at: result.updateAccount.updated_at,
            },
            message,
          });

        case 'activate':
          if (!input.account_id) {
            return this.error('account_id is required when activating an account');
          }

          result = await graphqlQuery<{ activateAccount: any }>(AccountMutations.ACTIVATE_ACCOUNT, {
            id: input.account_id,
          });

          message = `Activated account: ${result.activateAccount.name}`;
          console.log(`[ManageAccountTool] ${message}`);

          return this.success({
            operation: 'activate',
            account: {
              id: result.activateAccount.id,
              name: result.activateAccount.name,
              is_active: result.activateAccount.is_active,
              updated_at: result.activateAccount.updated_at,
            },
            message,
          });

        case 'deactivate':
          if (!input.account_id) {
            return this.error('account_id is required when deactivating an account');
          }

          result = await graphqlQuery<{ deactivateAccount: any }>(AccountMutations.DEACTIVATE_ACCOUNT, {
            id: input.account_id,
          });

          message = `Deactivated account: ${result.deactivateAccount.name}`;
          console.log(`[ManageAccountTool] ${message}`);

          return this.success({
            operation: 'deactivate',
            account: {
              id: result.deactivateAccount.id,
              name: result.deactivateAccount.name,
              is_active: result.deactivateAccount.is_active,
              updated_at: result.deactivateAccount.updated_at,
            },
            message,
          });

        case 'delete':
          if (!input.account_id) {
            return this.error('account_id is required when deleting an account');
          }

          result = await graphqlQuery<{ deleteAccount: boolean }>(AccountMutations.DELETE_ACCOUNT, {
            id: input.account_id,
          });

          message = `Deleted account`;
          console.log(`[ManageAccountTool] ${message}`);

          return this.success({
            operation: 'delete',
            success: result.deleteAccount,
            message,
          });

        default:
          return this.error(`Unknown operation: ${input.operation}`);
      }
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to ${input.operation} account: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: ManageAccountInput): string {
    switch (input.operation) {
      case 'create':
        return `Creating ${input.account_type || ''} account...`;
      case 'update':
        return `Updating account...`;
      case 'activate':
        return `Activating account...`;
      case 'deactivate':
        return `Deactivating account...`;
      case 'delete':
        return `Deleting account...`;
      default:
        return `Managing account...`;
    }
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
MANAGE ACCOUNT TOOL - Usage Instructions:

**When to Use:**
- User wants to create a new account for an organization or person
- User wants to update account information (contact details, notes, etc.)
- User wants to activate or deactivate an account
- User wants to delete an account

**Operations:**

1. **create**: Create a new account
   - Required: name, account_type (organization or person)
   - Optional: account_number (auto-generated if not provided), description, email, phone, address, website, tax_id, is_active, notes, member_id
   - Account types: "organization" for businesses/entities, "person" for individuals
   - Always create accounts with clear information

2. **update**: Modify an existing account
   - Required: account_id
   - Optional: All other fields can be updated
   - Use to change contact info, update notes, modify status, change member association

3. **activate**: Reactivate an inactive account
   - Required: account_id
   - Sets is_active to true
   - Use when account needs to be reactivated

4. **deactivate**: Mark account as inactive
   - Required: account_id
   - Sets is_active to false
   - Use when account should be temporarily disabled (not deleted)

5. **delete**: Remove account (soft delete)
   - Required: account_id
   - Soft deletion - preserves historical record
   - ALWAYS get user confirmation before deleting
   - Cannot delete accounts with existing financial transactions

**Usage Tips:**
- Always confirm account details before creating
- Include contact information (email, phone, address) when creating
- Link accounts to members using member_id when appropriate
- Handle tax IDs carefully - they are sensitive information
- Set appropriate account status (active/inactive)
- Get confirmation before deleting accounts
- Use deactivate instead of delete for temporary disabling

**Example Workflows:**

User: "Create an account for ABC Company"
Assistant:
1. Call manage_account with operation="create", name="ABC Company", account_type="organization"
2. Respond: "I've created an organization account for ABC Company with account number [Number]. Would you like to add contact information or link it to a member?"

User: "Update this account's email to info@example.com"
Assistant:
1. Call manage_account with operation="update", account_id, email="info@example.com"
2. Respond: "I've updated the account email to info@example.com."

User: "Deactivate this account"
Assistant:
1. Call manage_account with operation="deactivate", account_id
2. Respond: "I've deactivated this account. It can be reactivated later if needed."

User: "Create a person account for member John Smith"
Assistant:
1. Use search_members to find John Smith's ID
2. Call manage_account with operation="create", name="John Smith", account_type="person", member_id
3. Respond: "I've created a person account for John Smith and linked it to their member profile."

User: "Delete this account"
Assistant:
1. Confirm with user first: "Are you sure you want to delete this account? This action cannot be undone. Type 'yes' to confirm."
2. If confirmed, call manage_account with operation="delete", account_id
3. Respond: "I've deleted the account."

**Important Notes:**
- ALWAYS get user confirmation before deleting accounts
- Handle tax IDs and sensitive information with care
- Include clear descriptions when creating accounts
- Link accounts to members when appropriate
- Use deactivate for temporary disabling, delete only when necessary
- Provide clear feedback about what was changed
- Offer to help with related tasks (e.g., adding transactions after creating account)
    `.trim();
  }
}
