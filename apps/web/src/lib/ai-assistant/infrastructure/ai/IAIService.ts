/**
 * Common interface for AI services
 * Allows Claude and other AI providers to be used interchangeably
 */

import { ToolDefinition } from '../../core/interfaces/ITool';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string | any[];
}

export interface AIResponse {
  id: string;
  role: 'assistant';
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  }>;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AIStreamChunk {
  type: string;
  delta?: {
    type?: string;
    text?: string;
  };
  content_block?: {
    type: string;
    text?: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export interface SendMessageParams {
  messages: AIMessage[];
  system?: string;
  tools?: ToolDefinition[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * Common interface for AI services
 */
export interface IAIService {
  /**
   * Send a message and get a response
   */
  sendMessage(params: SendMessageParams): Promise<AIResponse>;

  /**
   * Stream a response (for real-time chat)
   */
  streamMessage(params: SendMessageParams): AsyncGenerator<AIStreamChunk, void, unknown>;

  /**
   * Test connection to the AI service
   */
  testConnection(): Promise<boolean>;
}

/**
 * Helper: Extract text from AI response
 */
export function extractTextFromResponse(response: AIResponse): string {
  const textBlocks = response.content.filter((block) => block.type === 'text');
  return textBlocks.map((block) => block.text || '').join('\n');
}

/**
 * Helper: Extract tool uses from AI response
 */
export interface ToolUse {
  id: string;
  name: string;
  input: any;
}

export function extractToolUses(response: AIResponse): ToolUse[] {
  return response.content
    .filter((block) => block.type === 'tool_use')
    .map((block) => ({
      id: block.id!,
      name: block.name!,
      input: block.input,
    }));
}

/**
 * Helper: Check if response contains tool uses
 */
export function hasToolUses(response: AIResponse): boolean {
  return response.stop_reason === 'tool_use' &&
         response.content.some(block => block.type === 'tool_use');
}

/**
 * Helper: Create tool result message
 */
export function createToolResultMessage(toolUseId: string, result: any, isError: boolean = false): any {
  // Ensure content is never empty, especially for errors
  let content: string;

  if (result === null || result === undefined) {
    content = isError ? 'An error occurred but no error message was provided' : 'null';
  } else if (typeof result === 'string') {
    content = result.trim() || (isError ? 'An error occurred but no error message was provided' : 'Empty result');
  } else {
    const stringified = JSON.stringify(result);
    content = stringified && stringified !== '{}' && stringified !== 'null'
      ? stringified
      : (isError ? 'An error occurred but no error details were provided' : 'Empty result');
  }

  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content,
    ...(isError && { is_error: true }),
  };
}
