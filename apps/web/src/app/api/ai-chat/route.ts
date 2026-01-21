/**
 * AI Chat API Endpoint
 * Handles chat requests with streaming support (SSE - Server-Sent Events)
 *
 * Features:
 * - Streaming responses via SSE
 * - Tool execution with progress updates
 * - Multi-turn agentic conversations
 * - Session management
 * - Error handling
 *
 * Environment Variables Required:
 * - ANTHROPIC_API_KEY: Your Anthropic API key
 */

import { NextRequest } from 'next/server';
import { createClaudeAPIService } from '@/lib/ai-assistant/infrastructure/ai';
import { createChatOrchestrator } from '@/lib/ai-assistant/AIAssistantFactory';
import type { ExecutionRequest } from '@/lib/ai-assistant/core/interfaces/IExecutor';
import type { AttachmentType } from '@/lib/ai-assistant/application/services/ChatOrchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Request body interface
 */
interface ChatRequest {
  message: string;
  sessionId: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  attachments?: Array<{
    name: string;
    type: AttachmentType;
    url: string;
    size?: number;
  }>;
}

/**
 * POST /api/ai-chat
 *
 * Processes a chat message and streams the response back to the client.
 * Supports multi-turn conversations with tool execution.
 */
export async function POST(request: NextRequest) {
  let streamController: ReadableStreamDefaultController | null = null;

  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, sessionId, conversationHistory = [], attachments = [] } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Session ID is required and must be a string' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'ANTHROPIC_API_KEY environment variable is not configured. Please set it to enable AI Assistant.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        streamController = controller;

        try {
          // Initialize Claude API service
          const aiService = createClaudeAPIService();

          // Create chat orchestrator with streaming support
          const orchestrator = await createChatOrchestrator(
            aiService,
            controller,
            (progress) => {
              // Progress callback - sent to client via SSE
              console.log('[AI Chat] Progress:', progress);
            }
          );

          // Build execution request
          const executionRequest: ExecutionRequest = {
            userMessage: message,
            conversationHistory: conversationHistory.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            attachments: attachments.map((att) => ({
              name: att.name,
              type: att.type,
              url: att.url,
              size: att.size,
            })),
            sessionId,
            // TODO: Add tenant context when available
            // tenantId: getTenantIdFromRequest(request),
          };

          // Execute the chat request with streaming
          await orchestrator.processMessage(executionRequest);

          // Close the stream
          controller.close();
        } catch (error: any) {
          console.error('[AI Chat API] Streaming error:', error);

          // Send error event to client
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            error: error.message || 'An error occurred while processing your message',
          })}\n\n`;

          try {
            controller.enqueue(new TextEncoder().encode(errorEvent));
          } catch (enqueueError) {
            console.error('[AI Chat API] Failed to enqueue error:', enqueueError);
          }

          controller.close();
        }
      },

      cancel() {
        console.log('[AI Chat API] Stream cancelled by client');
        streamController = null;
      },
    });

    // Return streaming response with SSE headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in nginx
      },
    });
  } catch (error: any) {
    console.error('[AI Chat API] Request error:', error);

    // If we have a stream controller, send error through it
    if (streamController) {
      try {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: error.message || 'Internal server error',
        })}\n\n`;

        streamController.enqueue(new TextEncoder().encode(errorEvent));
        streamController.close();
      } catch (streamError) {
        console.error('[AI Chat API] Failed to send error through stream:', streamError);
      }

      return new Response(null, { status: 200 }); // Stream was started, can't change status
    }

    // Return JSON error if stream wasn't started
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * GET /api/ai-chat
 *
 * Health check endpoint to verify the API is running
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'AI Chat API',
      version: '1.0.0',
      apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
