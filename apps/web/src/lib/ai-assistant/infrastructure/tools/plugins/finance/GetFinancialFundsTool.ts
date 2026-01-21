/**
 * GetFinancialFundsTool
 * Retrieves financial funds for transaction allocation
 *
 * Features:
 * - Lists all active funds
 * - Provides fund details including code and name
 * - Shows fund status and balance
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IFundRepository } from '@/repositories/fund.repository';

export interface GetFinancialFundsInput {
  // No input parameters - returns all funds
}

export class GetFinancialFundsTool extends BaseTool {
  readonly name = 'get_financial_funds';
  readonly description =
    'Retrieves the list of financial funds. Funds are used to track and allocate money for specific purposes ' +
    '(e.g., Building Fund, Missions Fund, General Operating Fund). ' +
    'Use this when you need to look up fund IDs for creating transactions or when the user asks about available funds.';

  getCategory(): string {
    return 'Finance Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'What funds are available?',
      'Show me all financial funds',
      'List all funds',
      'What funds can I allocate this transaction to?',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {},
      required: [],
    };
  }

  async execute(_input: GetFinancialFundsInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(_input);
    const startTime = Date.now();

    try {
      // Get fund repository
      const fundRepo = container.get<IFundRepository>(TYPES.IFundRepository);

      // Get all funds
      const result = await fundRepo.findAll();

      if (!result.success || !result.data) {
        return this.error('Failed to retrieve funds');
      }

      const funds = result.data;

      // Sort by name
      funds.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // Format for response
      const formattedFunds = funds.map((fund) => ({
        id: fund.id,
        code: fund.code || '',
        name: fund.name || '',
        description: fund.description || '',
        is_active: fund.is_active ?? true,
        is_default: fund.is_default ?? false,
      }));

      this.logSuccess(Date.now() - startTime);

      return this.success({
        funds: formattedFunds,
        total: formattedFunds.length,
        message: `Found ${formattedFunds.length} funds`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get funds: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(_input: GetFinancialFundsInput): string {
    return 'Retrieving financial funds...';
  }

  /**
   * Generate UI components to display funds
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.funds) {
      return null;
    }

    return [
      {
        type: 'FundList',
        props: {
          funds: result.data.funds,
          total: result.data.total,
        },
      },
    ];
  }

  /**
   * Provide system prompt instructions for this tool
   */
  getSystemPromptSection(): string {
    return `
GET FINANCIAL FUNDS TOOL - Usage Instructions:

**When to Use:**
- User asks about available funds
- You need to look up fund IDs for creating transactions
- User wants to know what funds exist
- Before creating a transaction, to help user select a fund

**What are Funds?**
Funds are designated accounts that track money allocated for specific purposes:
- General Operating Fund: Day-to-day church operations
- Building Fund: Construction or facility improvements
- Missions Fund: Missionary support and outreach
- Benevolence Fund: Helping those in need
- Youth Fund: Youth ministry activities
etc.

**Output:**
Returns a list of funds with:
- id: Fund ID (use this when creating transactions)
- code: Fund code for reference
- name: Display name of the fund
- description: Purpose of the fund
- is_active: Whether the fund is active
- is_default: Whether this is the default fund

**Usage Tips:**
- Use this tool proactively when user mentions creating a transaction but doesn't specify fund
- Present funds in a user-friendly format (e.g., "1. General Operating Fund (code: 1000)")
- Help user select the most appropriate fund based on the transaction purpose
- If user doesn't specify, suggest using the default fund
    `.trim();
  }
}
