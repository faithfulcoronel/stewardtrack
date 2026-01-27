/**
 * GetFinancialTransactionDetailsTool
 * Retrieves detailed information about a specific financial transaction using GraphQL
 *
 * Features:
 * - Get transaction by ID
 * - Returns complete transaction information
 * - Shows workflow status with timestamps
 * - Shows approval chain (submitted by, approved by, posted by)
 * - Includes void information if applicable
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, FinancialTransactionQueries } from '@/lib/graphql/client';

export interface GetFinancialTransactionDetailsInput {
  transaction_id: string;
}

export class GetFinancialTransactionDetailsTool extends BaseTool {
  readonly name = 'get_financial_transaction_details';
  readonly description =
    'Retrieves detailed information about a specific financial transaction by ID. ' +
    'Returns complete transaction information including status, workflow timestamps, approval chain, source, category, fund, and account details. ' +
    'Use this when the user asks for details about a specific transaction or wants to see the full transaction history.';

  getCategory(): string {
    return 'Finance Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me details about transaction #TXN-2024-001',
      'Get information about this transaction',
      'What\'s the status of transaction abc123?',
      'Show me the full details of this expense',
      'Who approved this transaction?',
      'When was this transaction posted?',
    ];
  }

  /**
   * Required permission for viewing financial transaction details
   */
  protected getRequiredPermissions(): string[] {
    return ['finance:view'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        transaction_id: {
          type: 'string',
          description: 'The unique ID of the financial transaction to retrieve',
        },
      },
      required: ['transaction_id'],
    };
  }

  async execute(input: GetFinancialTransactionDetailsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[GetFinancialTransactionDetailsTool] Using GraphQL query with transactionId="${input.transaction_id}"`);

      // Use GraphQL getFinancialTransaction query
      const result = await graphqlQuery<{ getFinancialTransaction: any }>(
        FinancialTransactionQueries.GET_FINANCIAL_TRANSACTION,
        {
          id: input.transaction_id,
        }
      );

      const transaction = result.getFinancialTransaction;

      if (!transaction) {
        console.log(`[GetFinancialTransactionDetailsTool] Transaction not found`);
        return this.error(`Transaction with ID "${input.transaction_id}" not found`);
      }

      console.log(`[GetFinancialTransactionDetailsTool] Found transaction ${transaction.transaction_number}`);

      // Format transaction data
      const formattedTransaction = {
        id: transaction.id,
        transaction_number: transaction.transaction_number,
        date: transaction.transaction_date,
        type: transaction.transaction_type,
        description: transaction.description,
        reference: transaction.reference || null,
        status: transaction.status,
        amount: transaction.amount,
        source: transaction.source ? {
          id: transaction.source.id,
          name: transaction.source.name,
          code: transaction.source.code,
          type: transaction.source.type,
        } : null,
        category: transaction.category ? {
          id: transaction.category.id,
          name: transaction.category.name,
          code: transaction.category.code,
          type: transaction.category.type,
        } : null,
        fund: transaction.fund ? {
          id: transaction.fund.id,
          name: transaction.fund.name,
          code: transaction.fund.code,
        } : null,
        account: transaction.account ? {
          id: transaction.account.id,
          name: transaction.account.name,
          account_number: transaction.account.account_number,
          account_type: transaction.account.account_type,
        } : null,
        workflow: {
          submitted_at: transaction.submitted_at || null,
          submitted_by: transaction.submitted_by || null,
          approved_at: transaction.approved_at || null,
          approved_by: transaction.approved_by || null,
          posted_at: transaction.posted_at || null,
          posted_by: transaction.posted_by || null,
          voided_at: transaction.voided_at || null,
          voided_by: transaction.voided_by || null,
          void_reason: transaction.void_reason || null,
        },
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
      };

      this.logSuccess(Date.now() - startTime);

      return this.success({
        transaction: formattedTransaction,
        message: `Retrieved transaction details for ${formattedTransaction.transaction_number}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get transaction details: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(_input: GetFinancialTransactionDetailsInput): string {
    return `Retrieving transaction details...`;
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET FINANCIAL TRANSACTION DETAILS TOOL - Usage Instructions:

**When to Use:**
- User asks for detailed information about a specific transaction
- User wants to see the full transaction record
- User needs workflow information (who submitted, approved, posted)
- User asks about transaction status or approval chain
- User wants to know if/why a transaction was voided

**Required Parameters:**
- transaction_id: The unique ID of the transaction (required)

**Information Returned:**
- Transaction number and ID
- Date, type, description, reference
- Amount and status
- Source details (bank account, cash, etc.)
- Category details (expense/income classification)
- Fund allocation
- Account (if designated)
- Complete workflow history:
  - Submitted timestamp and user
  - Approved timestamp and user
  - Posted timestamp and user
  - Voided timestamp, user, and reason (if applicable)
- Creation and update timestamps

**Transaction Status Workflow:**
1. draft → Created but not submitted
2. submitted → Submitted for approval
3. approved → Approved, ready to post
4. posted → Finalized to ledger (permanent)
5. voided → Cancelled (with reason)

**Usage Tips:**
- Present workflow information prominently for status questions
- Show approval chain for accountability
- Highlight void information if transaction was cancelled
- Note that posted transactions cannot be changed
- Use transaction_number for user-friendly reference

**Example Responses:**

User: "Show me details about transaction TXN-2024-001"
Assistant:
1. Calls get_financial_transaction_details with transaction_id="abc123"
2. Responds: "Here are the details for Transaction #TXN-2024-001:

   **Transaction Information:**
   - Type: Expense
   - Date: January 15, 2024
   - Amount: $125.50
   - Description: Office Supplies - Staples
   - Reference: INV-2024-0015
   - Status: Posted

   **Financial Details:**
   - Source: Operating Account (CHK-001)
   - Category: Office Expenses (EXP-OFC)
   - Fund: General Fund (GEN)
   - Account: Not designated

   **Workflow History:**
   - Created: January 15, 2024 9:30 AM
   - Submitted: January 15, 2024 10:00 AM by John Smith
   - Approved: January 15, 2024 2:15 PM by Jane Doe
   - Posted: January 16, 2024 8:00 AM by System

   This transaction has been finalized and cannot be changed."

User: "Who approved this transaction?"
Assistant:
1. Calls get_financial_transaction_details
2. Responds with approved_by user and timestamp

User: "Why was this transaction voided?"
Assistant:
1. Calls get_financial_transaction_details
2. If voided, responds: "This transaction was voided on [date] by [user]. Reason: [void_reason]"
3. If not voided, responds: "This transaction has not been voided. Current status: [status]"

**Important Notes:**
- Posted transactions are permanent and cannot be changed
- Voided transactions remain in the system for audit purposes
- Workflow timestamps track the approval chain for accountability
- Status determines what actions can be taken on the transaction
- Use transaction_number for user communication (more readable than ID)
    `.trim();
  }
}
