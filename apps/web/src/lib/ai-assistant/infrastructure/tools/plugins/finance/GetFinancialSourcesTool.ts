/**
 * GetFinancialSourcesTool
 * Retrieves financial sources (bank accounts, cash accounts, etc.)
 *
 * Features:
 * - Lists all active financial sources
 * - Provides source details including type and name
 * - Shows current balance if available
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IFinancialSourceRepository } from '@/repositories/financialSource.repository';

export interface GetFinancialSourcesInput {
  source_type?: 'bank' | 'cash' | 'digital_wallet' | 'all';
}

export class GetFinancialSourcesTool extends BaseTool {
  readonly name = 'get_financial_sources';
  readonly description =
    'Retrieves the list of financial sources (bank accounts, cash accounts, digital wallets, etc.). ' +
    'Financial sources represent where money comes from or goes to in transactions. ' +
    'Use this when you need to look up source IDs for creating transactions or when the user asks about available sources.';

  getCategory(): string {
    return 'Finance Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'What bank accounts do we have?',
      'Show me all financial sources',
      'List all cash accounts',
      'What sources can I use for this transaction?',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        source_type: {
          type: 'string',
          enum: ['bank', 'cash', 'digital_wallet', 'all'],
          description: 'Filter by source type. Defaults to "all" to show all types.',
        },
      },
      required: [],
    };
  }

  async execute(input: GetFinancialSourcesInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      // Get source repository
      const sourceRepo = container.get<IFinancialSourceRepository>(TYPES.IFinancialSourceRepository);

      // Get all sources
      const result = await sourceRepo.findAll();

      if (!result.success || !result.data) {
        return this.error('Failed to retrieve financial sources');
      }

      const sources = result.data;

      // Filter by type if specified
      const filterType = input.source_type || 'all';
      const filteredSources = sources.filter((source) => {
        if (filterType === 'all') return true;
        return source.source_type === filterType;
      });

      // Sort by name
      filteredSources.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // Format for response
      const formattedSources = filteredSources.map((source) => ({
        id: source.id,
        name: source.name || '',
        source_type: source.source_type || 'bank',
        description: source.description || '',
        is_active: source.is_active ?? true,
        is_default: source.is_default ?? false,
      }));

      this.logSuccess(Date.now() - startTime);

      return this.success({
        sources: formattedSources,
        total: formattedSources.length,
        filter: filterType,
        message: `Found ${formattedSources.length} ${filterType === 'all' ? '' : filterType + ' '}sources`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get financial sources: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(_input: GetFinancialSourcesInput): string {
    return 'Retrieving financial sources...';
  }

  /**
   * Generate UI components to display sources
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.sources) {
      return null;
    }

    return [
      {
        type: 'SourceList',
        props: {
          sources: result.data.sources,
          total: result.data.total,
          filter: result.data.filter,
        },
      },
    ];
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET FINANCIAL SOURCES TOOL - Usage Instructions:

**When to Use:**
- User asks about available bank accounts or cash accounts
- You need to look up source IDs for creating transactions
- User wants to know what financial sources exist
- Before creating a transaction, to help user select a source

**What are Financial Sources?**
Financial sources represent where money is stored or transacted:
- Bank accounts: Checking accounts, savings accounts
- Cash accounts: Petty cash, cash on hand
- Digital wallets: PayPal, Venmo, etc.

**Output:**
Returns a list of sources with:
- id: Source ID (use this when creating transactions)
- name: Display name of the source
- source_type: Type (bank, cash, digital_wallet)
- description: Additional details
- is_active: Whether the source is active
- is_default: Whether this is the default source

**Usage Tips:**
- Use this tool proactively when user mentions creating a transaction but doesn't specify source
- Present sources in a user-friendly format (e.g., "1. Main Checking Account (Bank)")
- Help user select the most appropriate source based on the transaction
- For cash expenses, suggest cash sources
- For electronic transactions, suggest bank or digital wallet sources
- If user doesn't specify, suggest using the default source
    `.trim();
  }
}
