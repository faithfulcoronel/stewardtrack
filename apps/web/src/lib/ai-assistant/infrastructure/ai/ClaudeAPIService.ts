/**
 * Claude API Service Implementation
 *
 * Implements the IAIService interface using the Anthropic Claude API.
 * Supports both regular and streaming message responses.
 *
 * Environment Variables Required:
 * - ANTHROPIC_API_KEY: Your Anthropic API key
 *
 * @see https://docs.anthropic.com/claude/reference/messages_post
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  IAIService,
  SendMessageParams,
  AIResponse,
  AIStreamChunk,
  AIMessage,
} from './IAIService';
import type { ToolDefinition } from '../../core/interfaces/ITool';

/**
 * Default model to use for Claude API
 * Currently using Claude 3.5 Sonnet for best performance
 */
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

/**
 * Default max tokens for responses
 */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Default temperature for responses (0.0 - 1.0)
 */
const DEFAULT_TEMPERATURE = 0.7;

/**
 * Claude API Service
 *
 * Concrete implementation of IAIService that calls the Anthropic Claude API.
 */
export class ClaudeAPIService implements IAIService {
  private client: Anthropic;
  private model: string;

  /**
   * Create a new Claude API service
   *
   * @param apiKey - Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
   * @param model - Model to use (defaults to claude-3-5-sonnet-20241022)
   */
  constructor(
    apiKey?: string,
    model: string = DEFAULT_MODEL
  ) {
    // Use provided API key or fall back to environment variable
    const key = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!key) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set. ' +
        'Please set it to your Anthropic API key.'
      );
    }

    this.client = new Anthropic({
      apiKey: key,
    });
    this.model = model;
  }

  /**
   * Send a message and get a complete response
   *
   * @param params - Message parameters
   * @returns AI response with content and metadata
   */
  async sendMessage(params: SendMessageParams): Promise<AIResponse> {
    const {
      messages,
      system,
      tools,
      max_tokens = DEFAULT_MAX_TOKENS,
      temperature = DEFAULT_TEMPERATURE,
    } = params;

    try {
      // Convert our message format to Anthropic format
      const anthropicMessages = this.convertMessages(messages);

      // Build request parameters
      const requestParams: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens,
        temperature,
        messages: anthropicMessages,
      };

      // Add system prompt if provided
      if (system) {
        requestParams.system = system;
      }

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestParams.tools = this.convertTools(tools);
      }

      // Call Claude API
      const response = await this.client.messages.create(requestParams);

      // Convert Anthropic response to our format
      return this.convertResponse(response);
    } catch (error: any) {
      console.error('[ClaudeAPIService] Error sending message:', error);
      throw new Error(
        `Failed to send message to Claude API: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Stream a response for real-time chat
   *
   * @param params - Message parameters
   * @yields Stream chunks as they arrive
   */
  async *streamMessage(params: SendMessageParams): AsyncGenerator<AIStreamChunk, void, unknown> {
    const {
      messages,
      system,
      tools,
      max_tokens = DEFAULT_MAX_TOKENS,
      temperature = DEFAULT_TEMPERATURE,
    } = params;

    try {
      // Convert our message format to Anthropic format
      const anthropicMessages = this.convertMessages(messages);

      // Build request parameters
      const requestParams: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens,
        temperature,
        messages: anthropicMessages,
      };

      // Add system prompt if provided
      if (system) {
        requestParams.system = system;
      }

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestParams.tools = this.convertTools(tools);
      }

      // Call Claude API with streaming
      const stream = await this.client.messages.stream(requestParams);

      // Yield chunks as they arrive
      for await (const chunk of stream) {
        yield this.convertStreamChunk(chunk);
      }
    } catch (error: any) {
      console.error('[ClaudeAPIService] Error streaming message:', error);
      throw new Error(
        `Failed to stream message from Claude API: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Test connection to Claude API
   *
   * @returns True if connection successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      // Send a simple test message
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      });

      return response.content.length > 0;
    } catch (error: any) {
      console.error('[ClaudeAPIService] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Convert our message format to Anthropic format
   */
  private convertMessages(messages: AIMessage[]): Anthropic.MessageParam[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Convert our tool definitions to Anthropic format
   */
  private convertTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  /**
   * Convert Anthropic response to our format
   */
  private convertResponse(response: Anthropic.Message): AIResponse {
    return {
      id: response.id,
      role: 'assistant',
      content: response.content
        .filter((block: any) => block.type === 'text' || block.type === 'tool_use')
        .map((block: any) => {
          if (block.type === 'text') {
            return {
              type: 'text' as const,
              text: block.text,
            };
          } else if (block.type === 'tool_use') {
            return {
              type: 'tool_use' as const,
              id: block.id,
              name: block.name,
              input: block.input,
            };
          }
          // This should never happen due to filter above
          return { type: 'text' as const, text: '' };
        }),
      stop_reason: response.stop_reason as any,
      usage: response.usage
        ? {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          }
        : undefined,
    };
  }

  /**
   * Convert Anthropic stream chunk to our format
   */
  private convertStreamChunk(chunk: any): AIStreamChunk {
    // Handle different chunk types
    if (chunk.type === 'content_block_start') {
      return {
        type: 'content_block_start',
        content_block: {
          type: chunk.content_block?.type || 'text',
          text: chunk.content_block?.text,
        },
      };
    }

    if (chunk.type === 'content_block_delta') {
      return {
        type: 'content_block_delta',
        delta: {
          type: chunk.delta?.type,
          text: chunk.delta?.text,
        },
      };
    }

    if (chunk.type === 'message_delta') {
      return {
        type: 'message_delta',
        usage: chunk.usage
          ? {
              input_tokens: chunk.usage.input_tokens,
              output_tokens: chunk.usage.output_tokens,
            }
          : undefined,
      };
    }

    // Default: return chunk as-is
    return {
      type: chunk.type,
    };
  }
}

/**
 * Factory function to create a Claude API service
 *
 * @param apiKey - Optional API key (defaults to env var)
 * @param model - Optional model (defaults to claude-3-5-sonnet-20241022)
 * @returns Configured Claude API service
 */
export function createClaudeAPIService(
  apiKey?: string,
  model?: string
): ClaudeAPIService {
  return new ClaudeAPIService(apiKey, model);
}
