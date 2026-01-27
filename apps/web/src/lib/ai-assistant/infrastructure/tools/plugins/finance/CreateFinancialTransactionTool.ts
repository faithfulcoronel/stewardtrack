/**
 * CreateFinancialTransactionTool
 * Creates income or expense financial transactions
 *
 * Features:
 * - Supports both income and expense types
 * - Can extract expense details from receipt images
 * - Integrates with existing IncomeExpenseTransactionService
 * - Validates required fields
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, FinancialTransactionMutations } from '@/lib/graphql/client';

export interface CreateFinancialTransactionInput {
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date?: string; // ISO date string, defaults to today
  reference?: string; // Optional reference number
  category_id: string;
  source_id: string;
  fund_id: string;
  account_id?: string | null;
}

export class CreateFinancialTransactionTool extends BaseTool {
  readonly name = 'create_financial_transaction';
  readonly description =
    'Creates a new income or expense financial transaction. Use this when the user wants to record income or expenses. ' +
    'If a receipt image is provided, the AI should extract the amount, description, and date from the image before calling this tool.';

  getCategory(): string {
    return 'Finance Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Record an expense of $50 for office supplies',
      'Add income of $1000 from donations',
      'Create an expense transaction for this receipt (with image)',
      'Log this expense to utilities category',
      'Record income from offerings',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        transaction_type: {
          type: 'string',
          enum: ['income', 'expense'],
          description: 'Type of transaction: income or expense. If user uploads a receipt image, this should be "expense".',
        },
        amount: {
          type: 'number',
          description: 'Transaction amount (positive number)',
        },
        description: {
          type: 'string',
          description: 'Description of the transaction (e.g., vendor name, what was purchased)',
        },
        transaction_date: {
          type: 'string',
          description: 'Transaction date in ISO format (YYYY-MM-DD). Defaults to today if not provided.',
        },
        category_id: {
          type: 'string',
          description: 'ID of the expense or income category',
        },
        source_id: {
          type: 'string',
          description: 'ID of the financial source (bank account, cash, etc.)',
        },
        fund_id: {
          type: 'string',
          description: 'ID of the fund to allocate this transaction to',
        },
        account_id: {
          type: 'string',
          description: 'Optional account holder ID (for designated accounts)',
        },
      },
      required: ['transaction_type', 'amount', 'description', 'category_id', 'source_id', 'fund_id'],
    };
  }

  /**
   * Required permission for creating financial transactions
   *
   * NOTE: Permission enforcement is handled by PermissionGate at the
   * executor level (PluginAwareAgenticExecutor) - the single source of truth.
   * This method only DECLARES the required permissions.
   */
  protected getRequiredPermissions(): string[] {
    return ['finance:manage'];
  }

  async execute(input: CreateFinancialTransactionInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      // NOTE: Permission check is handled by PermissionGate at executor level
      // This tool only needs to implement its business logic

      // Validate required fields
      const validation = this.validateRequired(input, [
        'transaction_type',
        'amount',
        'description',
        'category_id',
        'source_id',
        'fund_id',
      ]);

      if (!validation.valid) {
        return this.error(validation.error || 'Validation failed');
      }

      // Validate amount is positive
      if (input.amount <= 0) {
        return this.error('Amount must be greater than zero');
      }

      // Validate transaction type
      if (!['income', 'expense'].includes(input.transaction_type)) {
        return this.error('Transaction type must be either "income" or "expense"');
      }

      // Get transaction date (default to today)
      const transactionDate = input.transaction_date || new Date().toISOString().split('T')[0];

      console.log(`[CreateFinancialTransactionTool] Creating ${input.transaction_type} transaction using GraphQL`);

      // Create the transaction using GraphQL
      const result = await graphqlQuery<{ createFinancialTransaction: any }>(
        FinancialTransactionMutations.CREATE_FINANCIAL_TRANSACTION,
        {
          input: {
            transaction_type: input.transaction_type,
            transaction_date: transactionDate,
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

      const transaction = result.createFinancialTransaction;

      this.logSuccess(Date.now() - startTime);

      return this.success({
        transaction_id: transaction.id,
        transaction_number: transaction.transaction_number,
        transaction_type: input.transaction_type,
        amount: input.amount,
        description: input.description,
        date: transactionDate,
        status: transaction.status,
        source: transaction.source,
        category: transaction.category,
        fund: transaction.fund,
        message: `Successfully created ${input.transaction_type} transaction #${transaction.transaction_number} for $${input.amount.toFixed(2)} as draft. The transaction is pending approval.`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to create transaction: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: CreateFinancialTransactionInput): string {
    return `Creating ${input.transaction_type} transaction for $${input.amount?.toFixed(2) || '0.00'}...`;
  }

  /**
   * Generate UI components to display the transaction result
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data) {
      return null;
    }

    const data = result.data;

    return [
      {
        type: 'TransactionSummary',
        props: {
          id: data.transaction_id,
          type: data.transaction_type,
          amount: data.amount,
          description: data.description,
          date: data.date,
          status: data.status,
        },
      },
    ];
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
CREATE FINANCIAL TRANSACTION TOOL - Usage Instructions:

**When to Use:**
- User wants to record income or expense
- User uploads a receipt image
- User asks to "log", "record", "add", or "create" a transaction

**CRITICAL: Always Ask for Confirmation First**
NEVER create a transaction without user confirmation. Always:
1. Extract/collect the transaction details
2. Present the details to the user for review
3. Ask "Would you like me to create this transaction?"
4. Only call the tool after user explicitly confirms

**Receipt Image Handling:**
When the user uploads a receipt image:
1. The image will be included in the conversation automatically
2. You should analyze the receipt to extract:
   - Amount (look for total, subtotal, or payment amount)
   - Description (vendor name, what was purchased)
   - Date (transaction date on receipt)
   - Transaction type is ALWAYS "expense" for receipt images
3. Present the extracted information to the user for confirmation
4. Wait for user to confirm before calling create_financial_transaction

**Required Information:**
Before calling this tool, you need:
- transaction_type: "income" or "expense" (use "expense" for receipts)
- amount: The dollar amount (must be positive)
- description: What the transaction is for
- category_id: The expense/income category ID
- source_id: The financial source ID (bank account, cash, etc.)
- fund_id: The fund ID to allocate to

**Important Notes:**
- ALWAYS ask for user confirmation before creating any transaction
- Transactions are created as "draft" status and require approval
- For receipt images, always extract the information first before calling the tool
- If category, source, or fund IDs are not known, you may need to ask the user or use other tools to look them up
- Date defaults to today if not provided
- Present all transaction details clearly before asking for confirmation

**Example Workflow:**
User: "Record this expense" (with receipt image showing $45.99 from Office Depot)
Assistant:
1. Analyzes receipt image
2. Presents: "I found the following details on the receipt:
   - Amount: $45.99
   - Vendor: Office Depot
   - Description: Office Supplies
   - Date: 2024-01-15

   Would you like me to create this expense transaction?"
3. Waits for user confirmation
4. Only calls create_financial_transaction after user says yes
5. Confirms creation with user
    `.trim();
  }
}
