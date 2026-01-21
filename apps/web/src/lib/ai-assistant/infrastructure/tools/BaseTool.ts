/**
 * BaseTool Abstract Class
 * Provides common functionality for tool implementations
 *
 * Benefits:
 * - Reduces boilerplate code
 * - Enforces consistent tool structure
 * - Makes plugin development easier
 */

import { ITool, ToolDefinition, ToolResult, ToolExecutionContext } from '../../core/interfaces/ITool';

export abstract class BaseTool implements ITool {
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Get the tool definition for Claude API
   * Override this if you need custom schema structure
   */
  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.getInputSchema(),
    };
  }

  /**
   * Define the input schema for this tool
   * Must be implemented by each tool
   */
  protected abstract getInputSchema(): {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  /**
   * Execute the tool with given input
   * Must be implemented by each tool
   */
  abstract execute(input: any, context: ToolExecutionContext): Promise<ToolResult>;

  /**
   * Get a human-readable progress message
   * Override this to customize progress messages
   */
  getProgressMessage(input: any): string {
    return `Executing ${this.name}...`;
  }

  /**
   * Get the category this tool belongs to
   * Must be implemented by each tool
   */
  abstract getCategory(): string;

  /**
   * Get display name for the tool
   * Default implementation converts snake_case to Title Case
   * Override for custom display names
   */
  getDisplayName(): string {
    return this.name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get sample prompts for this tool
   * Must be implemented by each tool to provide usage examples
   */
  abstract getSamplePrompts(): string[];

  /**
   * Generate UI components from tool result
   * Override this if your tool needs custom visualization
   */
  generateComponents?(result: ToolResult): any[] | null {
    return null;
  }

  /**
   * Helper: Create success result
   */
  protected success(data: any): ToolResult {
    return {
      success: true,
      data,
    };
  }

  /**
   * Helper: Create error result
   */
  protected error(message: string): ToolResult {
    return {
      success: false,
      error: message,
    };
  }

  /**
   * Helper: Validate required fields in input
   */
  protected validateRequired(input: any, fields: string[]): { valid: boolean; error?: string } {
    for (const field of fields) {
      if (!input[field]) {
        return {
          valid: false,
          error: `Missing required field: ${field}`,
        };
      }
    }
    return { valid: true };
  }

  /**
   * Helper: Log tool execution start
   */
  protected logStart(input: any): void {
    console.log(`🔧 [${this.name}] Starting execution with input:`, JSON.stringify(input).substring(0, 200));
  }

  /**
   * Helper: Log tool execution success
   */
  protected logSuccess(duration: number): void {
    console.log(`✅ [${this.name}] Completed successfully in ${duration}ms`);
  }

  /**
   * Helper: Log tool execution error
   */
  protected logError(error: any): void {
    console.error(`❌ [${this.name}] Execution failed:`, error);
  }
}
