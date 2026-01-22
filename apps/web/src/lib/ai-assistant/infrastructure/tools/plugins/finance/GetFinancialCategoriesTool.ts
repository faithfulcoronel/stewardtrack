/**
 * GetFinancialCategoriesTool
 * Retrieves financial categories (expense and income categories)
 *
 * Features:
 * - Lists all active categories
 * - Filters by type (expense, income, or both)
 * - Provides category details including code and name
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ICategoryRepository } from '@/repositories/category.repository';

export interface GetFinancialCategoriesInput {
  category_type?: 'expense' | 'income' | 'all';
}

export class GetFinancialCategoriesTool extends BaseTool {
  readonly name = 'get_financial_categories';
  readonly description =
    'Retrieves the list of financial categories (expense and income categories). ' +
    'Use this when you need to look up category IDs for creating transactions or when the user asks about available categories.';

  getCategory(): string {
    return 'Finance Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'What expense categories are available?',
      'Show me all income categories',
      'List all financial categories',
      'What categories can I use for this expense?',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        category_type: {
          type: 'string',
          enum: ['expense', 'income', 'all'],
          description: 'Filter by category type. Defaults to "all" to show both expense and income categories.',
        },
      },
      required: [],
    };
  }

  async execute(input: GetFinancialCategoriesInput, _context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      // Get category repository
      const categoryRepo = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

      // Get all categories
      const result = await categoryRepo.findAll();

      if (!result.success || !result.data) {
        return this.error('Failed to retrieve categories');
      }

      const categories = result.data;

      // Filter by type if specified
      const filterType = input.category_type || 'all';
      const filteredCategories = categories.filter((cat) => {
        if (filterType === 'all') return true;
        return cat.category_type === filterType;
      });

      // Sort by name
      filteredCategories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // Format for response
      const formattedCategories = filteredCategories.map((cat) => ({
        id: cat.id,
        code: cat.code || '',
        name: cat.name || '',
        type: cat.category_type || 'expense',
        description: cat.description || '',
        is_active: cat.is_active ?? true,
      }));

      this.logSuccess(Date.now() - startTime);

      return this.success({
        categories: formattedCategories,
        total: formattedCategories.length,
        filter: filterType,
        message: `Found ${formattedCategories.length} ${filterType === 'all' ? '' : filterType + ' '}categories`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get categories: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(_input: GetFinancialCategoriesInput): string {
    return 'Retrieving financial categories...';
  }

  /**
   * Generate UI components to display categories
   */
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.categories) {
      return null;
    }

    return [
      {
        type: 'CategoryList',
        props: {
          categories: result.data.categories,
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
GET FINANCIAL CATEGORIES TOOL - Usage Instructions:

**When to Use:**
- User asks about available expense or income categories
- You need to look up category IDs for creating transactions
- User wants to know what categories exist
- Before creating a transaction, to help user select a category

**Output:**
Returns a list of categories with:
- id: Category ID (use this when creating transactions)
- code: Category code for reference
- name: Display name of the category
- type: "expense" or "income"
- description: Optional category description
- is_active: Whether the category is active

**Usage Tips:**
- Use this tool proactively when user mentions creating a transaction but doesn't specify category
- Present categories in a user-friendly format (e.g., "1. Office Supplies (code: 5010)")
- Help user select the most appropriate category based on their description
- Filter by type when you know if it's an expense or income transaction
    `.trim();
  }
}
