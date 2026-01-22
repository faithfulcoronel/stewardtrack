/**
 * AWS Bedrock API Service Implementation
 *
 * Implements the IAIService interface using AWS Bedrock with Claude models.
 * Supports both regular and streaming message responses via AWS SDK.
 *
 * Environment Variables Required:
 * - AWS_REGION: AWS region (e.g., us-west-2)
 * - AWS_ACCESS_KEY_ID: AWS access key (optional if using IAM roles)
 * - AWS_SECRET_ACCESS_KEY: AWS secret key (optional if using IAM roles)
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type {
  IAIService,
  SendMessageParams,
  AIResponse,
  AIStreamChunk,
  AIMessage,
} from './IAIService';
import type { ToolDefinition } from '../../core/interfaces/ITool';

/**
 * Default model to use for Bedrock
 * Uses Claude 3.5 Sonnet via Bedrock
 */
const DEFAULT_MODEL = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

/**
 * Default max tokens for responses
 */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Default temperature for responses (0.0 - 1.0)
 */
const DEFAULT_TEMPERATURE = 0.7;

/**
 * AWS Bedrock API Service
 *
 * Concrete implementation of IAIService that calls AWS Bedrock with Claude models.
 */
export class BedrockAPIService implements IAIService {
  private client: BedrockRuntimeClient;
  private model: string;

  /**
   * Create a new Bedrock API service
   *
   * @param region - AWS region (defaults to AWS_REGION env var or us-west-2)
   * @param model - Model ID to use (defaults to Claude 3.5 Sonnet)
   */
  constructor(
    region?: string,
    model: string = DEFAULT_MODEL
  ) {
    const awsRegion = region || process.env.AWS_REGION || 'us-west-2';

    // Initialize Bedrock client with explicit credential configuration
    // Priority order for credentials:
    // 1. Direct environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
    // 2. IAM role credentials (if running on EC2/ECS/Lambda)
    // 3. AWS_PROFILE environment variable / ~/.aws/credentials file

    const credentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
        }
      : undefined; // Fall back to default credential chain if env vars not set

    this.client = new BedrockRuntimeClient({
      region: awsRegion,
      ...(credentials && { credentials }), // Only set credentials if we have them from env vars
    });

    this.model = model;

    const authMethod = credentials ? 'explicit credentials' : 'default credential chain (IAM roles)';
    console.log(`[BedrockAPIService] Initialized with model: ${model}, region: ${awsRegion}, auth: ${authMethod}`);
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
      tools = [],
      max_tokens = DEFAULT_MAX_TOKENS,
      temperature = DEFAULT_TEMPERATURE,
    } = params;

    // Build request body in Claude Messages API format
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: max_tokens,
      temperature,
      messages: this.convertMessages(messages),
      ...(system && { system }),
      ...(tools.length > 0 && { tools: this.convertTools(tools) }),
    };

    try {
      const command = new InvokeModelCommand({
        modelId: this.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);

      // Parse response body
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return this.convertToAIResponse(responseBody);
    } catch (error: any) {
      console.error('[BedrockAPIService] Error sending message:', error);
      throw new Error(`Bedrock API error: ${error.message}`);
    }
  }

  /**
   * Send a message and stream the response
   *
   * @param params - Message parameters
   * @returns Async generator that yields streaming chunks
   */
  async *streamMessage(
    params: SendMessageParams
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const {
      messages,
      system,
      tools = [],
      max_tokens = DEFAULT_MAX_TOKENS,
      temperature = DEFAULT_TEMPERATURE,
    } = params;

    // Build request body
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: max_tokens,
      temperature,
      messages: this.convertMessages(messages),
      ...(system && { system }),
      ...(tools.length > 0 && { tools: this.convertTools(tools) }),
    };

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);

      if (!response.body) {
        throw new Error('No response body received from Bedrock');
      }

      // Process the stream
      for await (const event of response.body) {
        if (event.chunk) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

          // Convert Bedrock event to our AIStreamChunk format
          if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
            yield {
              type: 'content_block_delta',
              delta: {
                type: 'text_delta',
                text: chunk.delta.text,
              },
            } as AIStreamChunk;
          } else if (chunk.type === 'message_start') {
            yield {
              type: 'message_start',
              message: chunk.message,
            } as AIStreamChunk;
          } else if (chunk.type === 'message_delta') {
            yield {
              type: 'message_delta',
              delta: chunk.delta,
              usage: chunk.usage,
            } as AIStreamChunk;
          } else if (chunk.type === 'message_stop') {
            yield {
              type: 'message_stop',
            } as AIStreamChunk;
          } else if (chunk.type === 'content_block_start') {
            yield {
              type: 'content_block_start',
              index: chunk.index,
              content_block: chunk.content_block,
            } as AIStreamChunk;
          } else if (chunk.type === 'content_block_stop') {
            yield {
              type: 'content_block_stop',
              index: chunk.index,
            } as AIStreamChunk;
          }
        }
      }
    } catch (error: any) {
      console.error('[BedrockAPIService] Error streaming message:', error);
      throw new Error(`Bedrock streaming error: ${error.message}`);
    }
  }

  /**
   * Test connection to AWS Bedrock
   *
   * @returns true if connection is successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      // Send a minimal test message
      const testResponse = await this.sendMessage({
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
        max_tokens: 10,
      });

      return !!testResponse.id;
    } catch (error: any) {
      console.error('[BedrockAPIService] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Convert our message format to Claude API format
   */
  private convertMessages(messages: AIMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Convert our tool definitions to Claude API format
   */
  private convertTools(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  /**
   * Convert Bedrock response to our AIResponse format
   */
  private convertToAIResponse(response: any): AIResponse {
    return {
      id: response.id,
      role: response.role,
      content: response.content,
      stop_reason: response.stop_reason,
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
      },
    };
  }
}

/**
 * Factory function to create a Bedrock API service
 *
 * @param region - AWS region (optional, uses AWS_REGION env var)
 * @param model - Model ID to use (optional, uses default)
 * @returns Configured Bedrock API service instance
 */
export function createBedrockAPIService(
  region?: string,
  model?: string
): BedrockAPIService {
  return new BedrockAPIService(region, model);
}
