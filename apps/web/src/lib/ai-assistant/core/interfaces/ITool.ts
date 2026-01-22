/**
 * ITool Interface
 * Core contract for all AI Assistant tools (plugins)
 *
 * SOLID Principles:
 * - Single Responsibility: Each tool handles ONE specific capability
 * - Open/Closed: New tools can be added without modifying existing code
 * - Liskov Substitution: All tools are interchangeable through this interface
 * - Interface Segregation: Minimal, focused interface
 * - Dependency Inversion: High-level code depends on this abstraction
 */

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ToolProgress {
  type: 'progress';
  message: string;
  current?: number;
  total?: number;
  percentage?: number;
}

export interface ToolExecutionContext {
  userId?: string;
  sessionId?: string;
  userEmail?: string;
  tenantId?: string;
  context?: any;
  signal?: AbortSignal;
  onProgress?: (progress: ToolProgress) => void;
}

/**
 * Base interface that all tools must implement
 */
export interface ITool {
  /**
   * Unique identifier for the tool
   */
  readonly name: string;

  /**
   * Human-readable description of what the tool does
   */
  readonly description: string;

  /**
   * Tool definition for Claude API (includes input schema)
   */
  getDefinition(): ToolDefinition;

  /**
   * Execute the tool with given input
   * @param input - Tool-specific input parameters
   * @param context - Execution context (user info, tenant, etc.)
   * @returns ToolResult with success status and data/error
   */
  execute(input: any, context: ToolExecutionContext): Promise<ToolResult>;

  /**
   * Get a human-readable progress message for this tool execution
   * Used for streaming progress updates
   * @param input - Tool input parameters
   * @returns Progress message string
   */
  getProgressMessage(input: any): string;

  /**
   * Get the category this tool belongs to
   * Used for organizing tools in the UI
   * @returns Category name (e.g., "Member Tools", "Donation Tools")
   */
  getCategory(): string;

  /**
   * Get display name for the tool (human-readable)
   * @returns Display name formatted for UI
   */
  getDisplayName(): string;

  /**
   * Get sample prompts that demonstrate how to use this tool
   * @returns Array of sample prompt strings
   */
  getSamplePrompts(): string[];

  /**
   * Generate UI components from tool result (optional)
   * Allows tools to define their own visualization
   * @param result - Tool execution result
   * @returns Array of UI components or null
   */
  generateComponents?(result: ToolResult): any[] | null;

  /**
   * Get system prompt section for this tool (optional)
   * Allows tools to contribute their own instructions to the AI
   * Promotes composable, modular system prompts
   * @returns System prompt section or null/undefined if not needed
   */
  getSystemPromptSection?(): string | null;
}

/**
 * Optional interface for tools that need cleanup
 */
export interface IDisposableTool extends ITool {
  dispose(): Promise<void>;
}

/**
 * Optional interface for tools that support validation
 */
export interface IValidatableTool extends ITool {
  validateInput(input: any): { valid: boolean; error?: string };
}
