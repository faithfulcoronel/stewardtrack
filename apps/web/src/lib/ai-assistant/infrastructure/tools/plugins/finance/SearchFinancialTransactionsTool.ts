/**
 * SearchFinancialTransactionsTool
 * Searches financial transactions using GraphQL with filters
 *
 * Features:
 * - Search by description, reference, or transaction number
 * - Filter by transaction type (income, expense, transfer, etc.)
 * - Filter by status (draft, submitted, approved, posted, voided)
 * - Filter by date range
 * - Filter by category, source, fund, or account
 * - Uses GraphQL with caching for better performance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { graphqlQuery, FinancialTransactionQueries } from '@/lib/graphql/client';

export interface SearchFinancialTransactionsInput {
  search_term?: string;
  transaction_type?: 'income' | 'expense' | 'transfer' | 'opening_balance' | 'fund_rollover' | 'refund' | 'adjustment' | 'reclass' | 'reversal';
  status?: 'draft' | 'submitted' | 'approved' | 'posted' | 'voided';
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  category_id?: string;
  source_id?: string;
  fund_id?: string;
  limit?: number;
}

export class SearchFinancialTransactionsTool extends BaseTool {
  readonly name = 'search_financial_transactions';
  readonly description =
    'Searches for financial transactions with filtering options. Use this when the user wants to find income, expenses, or other transactions. ' +
    'Supports search by description, reference, transaction number, and filters by type, status, dates, category, source, or fund.';

  getCategory(): string {
    return 'Finance Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me all expenses from this month',
      'Find all posted income transactions',
      'Search for transactions with "office supplies"',
      'Show me draft transactions',
      'Find all transactions from January 2024',
      'Show me expenses from the Operations fund',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          description: 'Search text to match against description, reference, or transaction number',
        },
        transaction_type: {
          type: 'string',
          enum: ['income', 'expense', 'transfer', 'opening_balance', 'fund_rollover', 'refund', 'adjustment', 'reclass', 'reversal'],
          description: 'Filter by transaction type',
        },
        status: {
          type: 'string',
          enum: ['draft', 'submitted', 'approved', 'posted', 'voided'],
          description: 'Filter by transaction status',
        },
        start_date: {
          type: 'string',
          description: 'Filter transactions on or after this date (ISO format: YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          description: 'Filter transactions on or before this date (ISO format: YYYY-MM-DD)',
        },
        category_id: {
          type: 'string',
          description: 'Filter by expense/income category ID',
        },
        source_id: {
          type: 'string',
          description: 'Filter by financial source ID (bank account, cash, etc.)',
        },
        fund_id: {
          type: 'string',
          description: 'Filter by fund ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: [],
    };
  }

  async execute(input: SearchFinancialTransactionsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      console.log(`[SearchFinancialTransactionsTool] Using GraphQL query with filters:`, input);

      // Use GraphQL searchFinancialTransactions query
      const result = await graphqlQuery<{ searchFinancialTransactions: any[] }>(
        FinancialTransactionQueries.SEARCH_FINANCIAL_TRANSACTIONS,
        {
          searchTerm: input.search_term,
          transactionType: input.transaction_type,
          status: input.status,
          startDate: input.start_date,
          endDate: input.end_date,
          categoryId: input.category_id,
          sourceId: input.source_id,
          fundId: input.fund_id,
          limit: input.limit || 50,
        }
      );

      const transactions = result.searchFinancialTransactions;

      console.log(`[SearchFinancialTransactionsTool] Found ${transactions.length} transactions`);

      // Format results
      const formattedTransactions = transactions.map(t => ({
        id: t.id,
        transaction_number: t.transaction_number,
        date: t.transaction_date,
        type: t.transaction_type,
        description: t.description,
        reference: t.reference || null,
        status: t.status,
        amount: t.amount,
        source: t.source ? {
          id: t.source.id,
          name: t.source.name,
          code: t.source.code,
        } : null,
        category: t.category ? {
          id: t.category.id,
          name: t.category.name,
          code: t.category.code,
        } : null,
        fund: t.fund ? {
          id: t.fund.id,
          name: t.fund.name,
          code: t.fund.code,
        } : null,
        account: t.account ? {
          id: t.account.id,
          name: t.account.name,
          account_number: t.account.account_number,
        } : null,
        created_at: t.created_at,
      }));

      this.logSuccess(Date.now() - startTime);

      return this.success({
        transactions: formattedTransactions,
        count: formattedTransactions.length,
        message: `Found ${formattedTransactions.length} transaction(s)`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to search transactions: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(_input: SearchFinancialTransactionsInput): string {
    return `Searching financial transactions...`;
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
SEARCH FINANCIAL TRANSACTIONS TOOL - Usage Instructions:

**When to Use:**
- User wants to find specific income or expense transactions
- User asks to "show", "list", "find", or "search" for transactions
- User wants to filter transactions by type, status, date, category, source, or fund
- User asks for financial reports or summaries

**Search Parameters:**
- search_term: Text search across description, reference, and transaction number
- transaction_type: Filter by type (income, expense, transfer, etc.)
- status: Filter by workflow status (draft, submitted, approved, posted, voided)
- start_date/end_date: Filter by date range (ISO format: YYYY-MM-DD)
- category_id: Filter by expense or income category
- source_id: Filter by financial source (bank account, cash, etc.)
- fund_id: Filter by fund allocation
- limit: Max results to return (default: 50)

**Transaction Types:**
- income: Revenue, donations, offerings
- expense: Payments, purchases, bills
- transfer: Money moved between sources
- opening_balance: Initial account balance
- fund_rollover: Transfer between funds
- refund: Returned income
- adjustment: Corrections
- reclass: Reclassification
- reversal: Transaction reversal

**Transaction Status:**
- draft: Not yet submitted (can be edited or deleted)
- submitted: Submitted for approval
- approved: Approved, ready to post
- posted: Finalized to ledger (cannot be changed)
- voided: Cancelled transaction

**Information Returned:**
- Transaction ID and number
- Date, type, description, reference
- Status and amount
- Source (where money came from/went to)
- Category (income/expense classification)
- Fund (allocation)
- Account (if designated)

**Usage Tips:**
- Use date filters for monthly/quarterly reports
- Use status filter to find draft transactions needing review
- Combine filters for specific queries (e.g., "all posted expenses in December")
- Present transaction summaries with key details
- Group results by date, category, or fund when showing many transactions

**Example Queries:**

User: "Show me all expenses from this month"
Assistant:
1. Calculate start_date (first day of current month)
2. Calculate end_date (today or last day of month)
3. Call search_financial_transactions with:
   - transaction_type: "expense"
   - start_date: "2024-01-01"
   - end_date: "2024-01-31"
4. Present results grouped by category

User: "Find draft transactions"
Assistant:
1. Call search_financial_transactions with status: "draft"
2. Present results with note that these can still be edited

User: "Search for transactions with office supplies"
Assistant:
1. Call search_financial_transactions with search_term: "office supplies"
2. Show matching transactions

User: "Show me all posted income from the Building Fund"
Assistant:
1. First use get_financial_funds to find Building Fund ID
2. Call search_financial_transactions with:
   - transaction_type: "income"
   - status: "posted"
   - fund_id: [Building Fund ID]
3. Present total income and transaction list

**Important Notes:**
- Posted transactions are final and cannot be changed
- Draft transactions can be edited or deleted
- Use transaction_number for referencing specific transactions
- Date filters use inclusive ranges (>= start_date AND <= end_date)
- Empty search returns all transactions (up to limit)
    `.trim();
  }
}
