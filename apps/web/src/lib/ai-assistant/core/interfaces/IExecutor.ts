/**
 * IExecutor Interface
 * Contract for AI execution engines (e.g., Claude with tool use)
 */

import { ToolResult, ToolProgress } from './ITool';

export interface ExecutionStep {
  type: 'thinking' | 'tool_use' | 'response';
  content: string;
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  timestamp: Date;
}

export interface ExecutionResult {
  finalResponse: string;
  components: any[];
  steps: ExecutionStep[];
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface ExecutionRequest {
  userQuery: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string | any[]; // Support multimodal content (text + images)
  }>;
  context?: any;
  userId?: string;
  sessionId?: string;
  userEmail?: string;
  tenantId?: string;
  signal?: AbortSignal;
  memories?: any; // Relevant memories for context (from memory service)
}

/**
 * Progress event - can be execution step or tool progress
 */
export type ProgressEvent = ExecutionStep | ToolProgress;

/**
 * Progress callback for streaming updates
 */
export type ProgressCallback = (event: ProgressEvent) => void;

export interface IExecutor {
  /**
   * Execute an AI workflow with tool use
   * @param request - Execution request with query and history
   * @param onProgress - Optional callback for progress updates
   * @returns Execution result with response and components
   */
  execute(
    request: ExecutionRequest,
    onProgress?: ProgressCallback
  ): Promise<ExecutionResult>;
}
