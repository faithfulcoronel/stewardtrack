/**
 * ChatOrchestrator
 * Main application service that coordinates chat processing for StewardTrack
 *
 * SOLID Principles:
 * - Single Responsibility: Orchestrates the chat workflow
 * - Dependency Inversion: Depends on abstractions (interfaces)
 * - Open/Closed: Easy to extend without modification
 *
 * This is the high-level coordinator that brings everything together.
 */

import { IExecutor, ExecutionRequest, ExecutionResult, ExecutionStep } from '../../core/interfaces/IExecutor';
import { IStreamHandler } from '../../core/interfaces/IStreamHandler';
import { UserContext } from '../../core/value-objects/UserContext';
import { ToolRegistry } from './ToolRegistry';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

export interface ChatRequest {
  userQuery: string;
  messages: ChatMessage[];
  currentAttachments?: Attachment[]; // Attachments in the current user message
  context?: UserContext;
  sessionId?: string;
  userId?: string;
  userEmail: string;
  tenantId?: string;
  signal?: AbortSignal;
}

export interface ChatResponse {
  finalResponse: string;
  components: any[];
  steps: ExecutionStep[];
  sessionId: string;
  tokensUsed: {
    input: number;
    output: number;
  };
}

/**
 * ChatOrchestrator coordinates the entire chat workflow
 */
export class ChatOrchestrator {
  constructor(
    private executor: IExecutor,
    private toolRegistry: ToolRegistry,
    private streamHandler: IStreamHandler
  ) {}

  /**
   * Process a chat message with streaming support
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const requestId = `req_${Date.now()}`;
    console.log(`\n🎯 [${requestId}] ChatOrchestrator: Processing message`);
    console.log(`   User: ${request.userEmail}`);
    console.log(`   Tenant: ${request.tenantId || 'unknown'}`);
    console.log(`   Query: "${request.userQuery.substring(0, 80)}..."`);
    console.log(`   Tools available: ${this.toolRegistry.count()}`);

    if (request.currentAttachments && request.currentAttachments.length > 0) {
      console.log(`📎 [${requestId}] Current message has ${request.currentAttachments.length} attachment(s)`);
    }

    try {
      // Send start event
      this.streamHandler.sendStart(request.sessionId);

      // Send immediate feedback to user
      this.streamHandler.sendProgress({
        type: 'thinking',
        content: 'Reviewing your question and preparing response...',
        timestamp: new Date(),
      });

      // Build conversation history
      const conversationHistory = await Promise.all(
        request.messages.map(async (msg) => {
          // If message has attachments, build multimodal content
          if (msg.attachments && msg.attachments.length > 0) {
            const content: any[] = [];

            // Add text content if present
            if (msg.content) {
              content.push({
                type: 'text',
                text: msg.content,
              });
            }

            // Add attachments
            for (const attachment of msg.attachments) {
              if (attachment.type.startsWith('image/')) {
                // For images, convert to base64 and add as image content
                try {
                  const imageData = await this.loadImageAsBase64(attachment.url);
                  content.push({
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: attachment.type,
                      data: imageData,
                    },
                  });
                } catch (error) {
                  console.error(`❌ Failed to load image ${attachment.name}:`, error);
                  // Fallback: Add text description
                  content.push({
                    type: 'text',
                    text: `[Image: ${attachment.name}]`,
                  });
                }
              } else {
                // For text files, try to read and include content
                try {
                  const fileContent = await this.loadTextFile(attachment.url);
                  content.push({
                    type: 'text',
                    text: `[File: ${attachment.name}]\n\`\`\`\n${fileContent}\n\`\`\``,
                  });
                } catch (error) {
                  console.error(`❌ Failed to load file ${attachment.name}:`, error);
                  content.push({
                    type: 'text',
                    text: `[File: ${attachment.name} - ${attachment.type}]`,
                  });
                }
              }
            }

            return {
              role: msg.role,
              content,
            };
          }

          // Regular text-only message
          return {
            role: msg.role,
            content: msg.content,
          };
        })
      );

      // Build current user query with attachments (if present)
      let currentUserQuery: string | any[] = request.userQuery;

      if (request.currentAttachments && request.currentAttachments.length > 0) {
        this.streamHandler.sendProgress({
          type: 'thinking',
          content: `Processing ${request.currentAttachments.length} attachment(s)...`,
          timestamp: new Date(),
        });
        const content: any[] = [];

        // Add text content (the user query)
        if (request.userQuery) {
          content.push({
            type: 'text',
            text: request.userQuery,
          });
        }

        // Add current attachments
        for (const attachment of request.currentAttachments) {
          if (attachment.type.startsWith('image/')) {
            // For images, convert to base64 and add as image content
            try {
              console.log(`📷 [${requestId}] Loading image: ${attachment.name}`);
              const imageData = await this.loadImageAsBase64(attachment.url);
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: attachment.type,
                  data: imageData,
                },
              });
              console.log(`✅ [${requestId}] Image loaded: ${attachment.name}`);
            } catch (error) {
              console.error(`❌ Failed to load image ${attachment.name}:`, error);
              content.push({
                type: 'text',
                text: `[Image: ${attachment.name}]`,
              });
            }
          } else {
            // For text files, try to read and include content
            try {
              console.log(`📄 [${requestId}] Loading file: ${attachment.name}`);
              const fileContent = await this.loadTextFile(attachment.url);
              content.push({
                type: 'text',
                text: `[File: ${attachment.name}]\n\`\`\`\n${fileContent}\n\`\`\``,
              });
              console.log(`✅ [${requestId}] File loaded: ${attachment.name}`);
            } catch (error) {
              console.error(`❌ Failed to load file ${attachment.name}:`, error);
              content.push({
                type: 'text',
                text: `[File: ${attachment.name} - ${attachment.type}]`,
              });
            }
          }
        }

        // Use multimodal content as the current query
        currentUserQuery = content;
        console.log(`📦 [${requestId}] Built multimodal query with ${content.length} content blocks`);
      }

      // Execute AI workflow
      console.log(`🤖 [${requestId}] Executing AI workflow...`);
      this.streamHandler.sendProgress({
        type: 'thinking',
        content: 'Connecting to AI Assistant...',
        timestamp: new Date(),
      });

      const result = await this.executor.execute(
        {
          userQuery: currentUserQuery as any, // Can be string or array for multimodal
          conversationHistory,
          context: request.context,
          sessionId: request.sessionId,
          userEmail: request.userEmail,
          userId: request.userId,
          tenantId: request.tenantId,
          signal: request.signal,
        },
        // Progress callback for streaming
        (step) => {
          this.streamHandler.sendProgress(step);
        }
      );

      console.log(`✅ [${requestId}] AI workflow completed`);
      console.log(`   Steps: ${result.steps.length}`);
      console.log(`   Components: ${result.components.length}`);
      console.log(`   Tokens: ${result.tokensUsed.input} in, ${result.tokensUsed.output} out`);

      console.log(`📦 ChatOrchestrator returning ${result.components?.length || 0} components`);

      return {
        finalResponse: result.finalResponse,
        components: result.components,
        steps: result.steps,
        sessionId: request.sessionId || '',
        tokensUsed: result.tokensUsed,
      };
    } catch (error: any) {
      console.error(`❌ [${requestId}] ChatOrchestrator error:`, error);
      this.streamHandler.sendError(error.message || 'Unknown error');
      throw error;
    }
  }

  /**
   * Load image as base64 string
   */
  private async loadImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return base64;
  }

  /**
   * Load text file content
   */
  private async loadTextFile(url: string): Promise<string> {
    const response = await fetch(url);
    const text = await response.text();
    return text.substring(0, 10000); // Limit to 10K characters
  }
}
