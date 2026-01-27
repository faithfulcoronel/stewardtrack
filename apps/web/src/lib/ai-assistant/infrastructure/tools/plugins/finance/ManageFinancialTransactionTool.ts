/**
 * ManageFinancialTransactionTool
 * Manages financial transaction operations using GraphQL mutations
 *
 * Features:
 * - Create new financial transaction
 * - Update existing transaction (draft only)
 * - Submit transaction for approval
 * - Approve transaction
 * - Post transaction (finalize to ledger)
 * - Void transaction (cancel with reason)
 * - Delete transaction (soft delete - draft only)
 * - Uses GraphQL mutations with cache invalidation
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, FinancialTransactionMutations } from '@/lib/graphql/client';

export interface ManageFinancialTransactionInput {
  operation: 'create' | 'update' | 'submit' | 'approve' | 'post' | 'void' | 'delete';
  transaction_id?: string;
  transaction_type?: 'income' | 'expense' | 'transfer' | 'opening_balance' | 'fund_rollover' | 'refund' | 'adjustment' | 'reclass' | 'reversal';
  transaction_date?: string; // ISO date
  description?: string;
  reference?: string;
  amount?: number;
  category_id?: string;
  source_id?: string;
  fund_id?: string;
  account_id?: string;
  void_reason?: string;
}

export class ManageFinancialTransactionTool extends BaseTool {
  readonly name = 'manage_financial_transaction';
  readonly description =
    'Manages financial transaction operations: create, update, submit, approve, post, void, or delete. ' +
    'Use this when the user wants to create new transactions, modify existing ones, move them through approval workflow, or cancel them.';

  getCategory(): string {
    return 'Finance Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Create an expense transaction for $50',
      'Update this transaction amount to $75',
      'Submit this transaction for approval',
      'Approve this transaction',
      'Post this transaction to the ledger',
      'Void this transaction because it was duplicate',
      'Delete this draft transaction',
    ];
  }

  /**
   * Required permission for managing financial transactions
   *
   * NOTE: Permission enforcement is handled by PermissionGate at the
   * executor level (PluginAwareAgenticExecutor) - the single source of truth.
   * This method only DECLARES the required permissions.
   */
  protected getRequiredPermissions(): string[] {
    return ['finance:manage'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        operation: {
          type: 'string',
          enum: ['create', 'update', 'submit', 'approve', 'post', 'void', 'delete'],
          description: 'The operation to perform: create (new transaction), update (modify draft), submit (for approval), approve (authorize), post (finalize), void (cancel with reason), delete (remove draft)',
        },
        transaction_id: {
          type: 'string',
          description: 'The unique ID of the transaction (required for update, submit, approve, post, void, delete operations)',
        },
        transaction_type: {
          type: 'string',
          enum: ['income', 'expense', 'transfer', 'opening_balance', 'fund_rollover', 'refund', 'adjustment', 'reclass', 'reversal'],
          description: 'Type of transaction (required for create)',
        },
        transaction_date: {
          type: 'string',
          description: 'Transaction date in ISO format (YYYY-MM-DD) (required for create, optional for update)',
        },
        description: {
          type: 'string',
          description: 'Transaction description (required for create, optional for update)',
        },
        reference: {
          type: 'string',
          description: 'Transaction reference number or code (optional)',
        },
        amount: {
          type: 'number',
          description: 'Transaction amount (required for create, optional for update)',
        },
        category_id: {
          type: 'string',
          description: 'ID of expense or income category (required for create, optional for update)',
        },
        source_id: {
          type: 'string',
          description: 'ID of financial source - bank account, cash, etc. (required for create, optional for update)',
        },
        fund_id: {
          type: 'string',
          description: 'ID of fund for allocation (required for create, optional for update)',
        },
        account_id: {
          type: 'string',
          description: 'Optional account ID for designated accounts',
        },
        void_reason: {
          type: 'string',
          description: 'Reason for voiding the transaction (required for void operation)',
        },
      },
      required: ['operation'],
    };
  }

  async execute(input: ManageFinancialTransactionInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[ManageFinancialTransactionTool] Operation: ${input.operation}, transactionId=${input.transaction_id}`);

      let result: any;
      let message: string;

      switch (input.operation) {
        case 'create':
          if (!input.transaction_type || !input.transaction_date || !input.description || !input.amount || !input.category_id || !input.source_id || !input.fund_id) {
            return this.error('transaction_type, transaction_date, description, amount, category_id, source_id, and fund_id are required when creating a transaction');
          }

          result = await graphqlQuery<{ createFinancialTransaction: any }>(
            FinancialTransactionMutations.CREATE_FINANCIAL_TRANSACTION,
            {
              input: {
                transaction_type: input.transaction_type,
                transaction_date: input.transaction_date,
                description: input.description,
                reference: input.reference,
                amount: input.amount,
                category_id: input.category_id,
                source_id: input.source_id,
                fund_id: input.fund_id,
                account_id: input.account_id,
              },
            }
          );

          message = `Created ${result.createFinancialTransaction.transaction_type} transaction #${result.createFinancialTransaction.transaction_number} for $${result.createFinancialTransaction.amount.toFixed(2)}`;

          if (result.createFinancialTransaction.category) {
            message += ` (${result.createFinancialTransaction.category.name})`;
          }

          console.log(`[ManageFinancialTransactionTool] ${message}`);

          return this.success({
            operation: 'create',
            transaction: {
              id: result.createFinancialTransaction.id,
              transaction_number: result.createFinancialTransaction.transaction_number,
              type: result.createFinancialTransaction.transaction_type,
              date: result.createFinancialTransaction.transaction_date,
              description: result.createFinancialTransaction.description,
              amount: result.createFinancialTransaction.amount,
              status: result.createFinancialTransaction.status,
              source: result.createFinancialTransaction.source,
              category: result.createFinancialTransaction.category,
              fund: result.createFinancialTransaction.fund,
              created_at: result.createFinancialTransaction.created_at,
            },
            message,
          });

        case 'update':
          if (!input.transaction_id) {
            return this.error('transaction_id is required when updating a transaction');
          }

          result = await graphqlQuery<{ updateFinancialTransaction: any }>(
            FinancialTransactionMutations.UPDATE_FINANCIAL_TRANSACTION,
            {
              id: input.transaction_id,
              input: {
                transaction_date: input.transaction_date,
                description: input.description,
                reference: input.reference,
                amount: input.amount,
                category_id: input.category_id,
                source_id: input.source_id,
                fund_id: input.fund_id,
                account_id: input.account_id,
              },
            }
          );

          message = `Updated transaction #${result.updateFinancialTransaction.transaction_number}`;
          console.log(`[ManageFinancialTransactionTool] ${message}`);

          return this.success({
            operation: 'update',
            transaction: {
              id: result.updateFinancialTransaction.id,
              transaction_number: result.updateFinancialTransaction.transaction_number,
              type: result.updateFinancialTransaction.transaction_type,
              date: result.updateFinancialTransaction.transaction_date,
              description: result.updateFinancialTransaction.description,
              amount: result.updateFinancialTransaction.amount,
              status: result.updateFinancialTransaction.status,
              updated_at: result.updateFinancialTransaction.updated_at,
            },
            message,
          });

        case 'submit':
          if (!input.transaction_id) {
            return this.error('transaction_id is required when submitting a transaction');
          }

          result = await graphqlQuery<{ submitFinancialTransaction: any }>(
            FinancialTransactionMutations.SUBMIT_FINANCIAL_TRANSACTION,
            {
              id: input.transaction_id,
            }
          );

          message = `Submitted transaction for approval`;
          console.log(`[ManageFinancialTransactionTool] ${message}`);

          return this.success({
            operation: 'submit',
            transaction: {
              id: result.submitFinancialTransaction.id,
              status: result.submitFinancialTransaction.status,
              submitted_at: result.submitFinancialTransaction.submitted_at,
              submitted_by: result.submitFinancialTransaction.submitted_by,
            },
            message,
          });

        case 'approve':
          if (!input.transaction_id) {
            return this.error('transaction_id is required when approving a transaction');
          }

          result = await graphqlQuery<{ approveFinancialTransaction: any }>(
            FinancialTransactionMutations.APPROVE_FINANCIAL_TRANSACTION,
            {
              id: input.transaction_id,
            }
          );

          message = `Approved transaction - ready to post`;
          console.log(`[ManageFinancialTransactionTool] ${message}`);

          return this.success({
            operation: 'approve',
            transaction: {
              id: result.approveFinancialTransaction.id,
              status: result.approveFinancialTransaction.status,
              approved_at: result.approveFinancialTransaction.approved_at,
              approved_by: result.approveFinancialTransaction.approved_by,
            },
            message,
          });

        case 'post':
          if (!input.transaction_id) {
            return this.error('transaction_id is required when posting a transaction');
          }

          result = await graphqlQuery<{ postFinancialTransaction: any }>(
            FinancialTransactionMutations.POST_FINANCIAL_TRANSACTION,
            {
              id: input.transaction_id,
            }
          );

          message = `Posted transaction to ledger - transaction is now final and cannot be changed`;
          console.log(`[ManageFinancialTransactionTool] ${message}`);

          return this.success({
            operation: 'post',
            transaction: {
              id: result.postFinancialTransaction.id,
              status: result.postFinancialTransaction.status,
              posted_at: result.postFinancialTransaction.posted_at,
              posted_by: result.postFinancialTransaction.posted_by,
            },
            message,
          });

        case 'void':
          if (!input.transaction_id) {
            return this.error('transaction_id is required when voiding a transaction');
          }
          if (!input.void_reason) {
            return this.error('void_reason is required when voiding a transaction');
          }

          result = await graphqlQuery<{ voidFinancialTransaction: any }>(
            FinancialTransactionMutations.VOID_FINANCIAL_TRANSACTION,
            {
              id: input.transaction_id,
              reason: input.void_reason,
            }
          );

          message = `Voided transaction. Reason: ${input.void_reason}`;
          console.log(`[ManageFinancialTransactionTool] ${message}`);

          return this.success({
            operation: 'void',
            transaction: {
              id: result.voidFinancialTransaction.id,
              status: result.voidFinancialTransaction.status,
              voided_at: result.voidFinancialTransaction.voided_at,
              voided_by: result.voidFinancialTransaction.voided_by,
              void_reason: result.voidFinancialTransaction.void_reason,
            },
            message,
          });

        case 'delete':
          if (!input.transaction_id) {
            return this.error('transaction_id is required when deleting a transaction');
          }

          result = await graphqlQuery<{ deleteFinancialTransaction: boolean }>(
            FinancialTransactionMutations.DELETE_FINANCIAL_TRANSACTION,
            {
              id: input.transaction_id,
            }
          );

          message = `Deleted draft transaction`;
          console.log(`[ManageFinancialTransactionTool] ${message}`);

          return this.success({
            operation: 'delete',
            success: result.deleteFinancialTransaction,
            message,
          });

        default:
          return this.error(`Unknown operation: ${input.operation}`);
      }
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to ${input.operation} transaction: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: ManageFinancialTransactionInput): string {
    switch (input.operation) {
      case 'create':
        return `Creating ${input.transaction_type || 'financial'} transaction...`;
      case 'update':
        return `Updating transaction...`;
      case 'submit':
        return `Submitting transaction for approval...`;
      case 'approve':
        return `Approving transaction...`;
      case 'post':
        return `Posting transaction to ledger...`;
      case 'void':
        return `Voiding transaction...`;
      case 'delete':
        return `Deleting transaction...`;
      default:
        return `Managing transaction...`;
    }
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
MANAGE FINANCIAL TRANSACTION TOOL - Usage Instructions:

**When to Use:**
- User wants to create a new income or expense transaction
- User wants to update a draft transaction
- User wants to move a transaction through the approval workflow
- User wants to cancel or void a transaction
- User wants to delete a draft transaction

**Operations:**

1. **create**: Create a new financial transaction
   - Required: transaction_type, transaction_date, description, amount, category_id, source_id, fund_id
   - Optional: reference, account_id
   - Creates transaction in draft status
   - Always get user confirmation before creating

2. **update**: Modify an existing draft transaction
   - Required: transaction_id
   - Optional: transaction_date, description, reference, amount, category_id, source_id, fund_id, account_id
   - Can only update draft transactions
   - Submitted, approved, or posted transactions cannot be updated

3. **submit**: Submit a draft transaction for approval
   - Required: transaction_id
   - Moves transaction from draft to submitted status
   - Transaction enters approval workflow

4. **approve**: Approve a submitted transaction
   - Required: transaction_id
   - Moves transaction from submitted to approved status
   - Transaction is ready to be posted

5. **post**: Post an approved transaction to the ledger (finalize)
   - Required: transaction_id
   - Moves transaction from approved to posted status
   - Transaction becomes permanent and cannot be changed
   - This is the final step in the workflow

6. **void**: Cancel a transaction with a reason
   - Required: transaction_id, void_reason
   - Marks transaction as voided
   - Preserves transaction for audit trail
   - Use for corrections or cancellations

7. **delete**: Remove a draft transaction (soft delete)
   - Required: transaction_id
   - Only works for draft transactions
   - Use sparingly - prefer void for posted transactions
   - ALWAYS get user confirmation before deleting

**Transaction Types:**
- income: Revenue, donations, offerings
- expense: Payments, purchases, bills
- transfer: Move money between sources
- opening_balance: Initial account balance
- fund_rollover: Transfer between funds
- refund: Return income
- adjustment: Corrections
- reclass: Reclassification
- reversal: Transaction reversal

**Workflow States:**
draft → submitted → approved → posted
                              ↓
                           voided (from any state)

**Usage Tips:**
- ALWAYS get user confirmation before creating transactions
- ALWAYS get user confirmation before deleting transactions
- Only draft transactions can be updated or deleted
- Posted transactions are permanent - cannot be changed
- Use void (not delete) for posted transactions that need cancellation
- Void requires a reason for audit purposes
- Present transaction details after creation for user verification

**Example Workflows:**

User: "Create an expense for $50 for office supplies"
Assistant:
1. Use get_financial_categories to find "Office Supplies" category
2. Use get_financial_sources to find appropriate source (e.g., "Operating Account")
3. Use get_financial_funds to find appropriate fund (e.g., "General Fund")
4. Present details to user: "I'll create an expense transaction:
   - Amount: $50.00
   - Description: Office Supplies
   - Category: Office Expenses
   - Source: Operating Account
   - Fund: General Fund
   - Date: Today

   Should I create this transaction?"
5. Wait for confirmation
6. Call manage_financial_transaction with operation="create"
7. Confirm creation: "Created draft transaction #TXN-2024-001. The transaction is in draft status and can be edited or submitted for approval."

User: "Update the amount to $75"
Assistant:
1. Find transaction ID from context
2. Call manage_financial_transaction with operation="update", amount=75
3. Respond: "Updated transaction #TXN-2024-001 amount to $75.00"

User: "Submit this for approval"
Assistant:
1. Call manage_financial_transaction with operation="submit"
2. Respond: "Submitted transaction #TXN-2024-001 for approval. It's now awaiting authorization."

User: "Approve this transaction"
Assistant:
1. Call manage_financial_transaction with operation="approve"
2. Respond: "Approved transaction #TXN-2024-001. It's now ready to be posted to the ledger."

User: "Post this to the ledger"
Assistant:
1. Call manage_financial_transaction with operation="post"
2. Respond: "Posted transaction #TXN-2024-001 to the ledger. This transaction is now final and cannot be changed."

User: "Void this transaction - it was entered by mistake"
Assistant:
1. Call manage_financial_transaction with operation="void", void_reason="Entered by mistake"
2. Respond: "Voided transaction #TXN-2024-001. Reason: Entered by mistake. The transaction remains in the system for audit purposes but is marked as cancelled."

User: "Delete this draft"
Assistant:
1. Confirm: "Are you sure you want to delete this draft transaction? This action cannot be undone."
2. Wait for confirmation
3. Call manage_financial_transaction with operation="delete"
4. Respond: "Deleted draft transaction."

**Important Notes:**
- ALWAYS get user confirmation before creating or deleting
- Draft transactions can be edited freely
- Submitted/approved transactions cannot be edited (must void and recreate)
- Posted transactions are permanent - only void is allowed
- Void preserves transaction for auditing
- Include transaction_number in responses for user reference
- Present workflow status clearly
    `.trim();
  }
}
