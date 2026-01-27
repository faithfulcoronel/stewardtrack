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
import { createAIService, validateAIProviderConfig } from '@/lib/ai-assistant/infrastructure/ai';
import { createChatOrchestrator } from '@/lib/ai-assistant/AIAssistantFactory';
import type { ChatRequest as OrchestratorChatRequest, ChatMessage, Attachment } from '@/lib/ai-assistant/application/services/ChatOrchestrator';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditService } from '@/services/AICreditService';
import type { AuthorizationService } from '@/services/AuthorizationService';
import { LicenseGate, PermissionGate, all } from '@/lib/access-gate';
import { tenantUtils } from '@/utils/tenantUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Request body interface (from client)
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
    type: string;
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
  let tenantId: string | null = null;
  let userId: string | null = null;
  let sessionId: string = '';
  let authResult: any = null;

  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, sessionId: reqSessionId, conversationHistory = [], attachments = [] } = body;
    sessionId = reqSessionId;

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

    // Validate AI provider configuration
    const providerValidation = validateAIProviderConfig();
    if (!providerValidation.valid) {
      return new Response(
        JSON.stringify({
          error: providerValidation.error || 'AI service is not configured properly.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // === AI CREDITS: Check authentication and credits before processing ===
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    authResult = await authService.checkAuthentication();

    if (!authResult.authorized || !authResult.user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized. Please sign in to use AI Assistant.',
          error_code: 'UNAUTHORIZED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    userId = authResult.user.id;
    tenantId = await tenantUtils.getTenantId();

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          error: 'Tenant context not found. Please ensure you are properly logged in.',
          error_code: 'NO_TENANT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // === ACCESS GATE: Single source of truth for license + permission checks ===
    // Uses LicenseGate and PermissionGate from access-gate system
    const accessGate = all(
      new LicenseGate('ai_assistant', {
        fallbackPath: '/admin/settings?tab=subscription'
      }),
      new PermissionGate('ai_assistant:access', 'all', {
        fallbackPath: '/unauthorized?reason=ai_assistant_access'
      })
    );

    const accessResult = await accessGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      // Determine error type based on what failed
      const isLicenseIssue = accessResult.requiresUpgrade || accessResult.lockedFeatures?.length;

      if (isLicenseIssue) {
        return new Response(
          JSON.stringify({
            error: 'AI Assistant feature is not enabled for your account. Please upgrade your plan to access this feature.',
            error_code: 'FEATURE_NOT_LICENSED',
            upgrade_url: '/admin/settings?tab=subscription'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Permission issue
      return new Response(
        JSON.stringify({
          error: 'You do not have permission to access the AI Assistant. Please contact your administrator.',
          error_code: 'PERMISSION_DENIED',
          missing_permissions: accessResult.missingPermissions
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if tenant has sufficient credits
    const creditService = container.get<AICreditService>(TYPES.AICreditService);
    const hasSufficientCredits = await creditService.hasSufficientCredits(tenantId, 1);

    if (!hasSufficientCredits) {
      // Check if auto-recharge should be triggered
      const shouldAutoRecharge = await creditService.shouldTriggerAutoRecharge(tenantId);

      if (shouldAutoRecharge) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient credits. Auto-recharge has been initiated. Please wait a moment and try again.',
            error_code: 'AUTO_RECHARGE_PENDING',
            action_required: 'wait'
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Insufficient AI credits. Please purchase more credits to continue using the AI Assistant.',
          error_code: 'INSUFFICIENT_CREDITS',
          purchase_url: '/admin/settings?tab=ai-credits',
          action_required: 'purchase'
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let controllerClosed = false;

        try {
          // Initialize AI service (supports both Anthropic API and AWS Bedrock)
          const aiService = createAIService();

          // Create chat orchestrator with streaming support
          const orchestrator = await createChatOrchestrator(
            aiService,
            controller,
            (progress) => {
              // Progress callback - sent to client via SSE
              console.log('[AI Chat] Progress:', progress);
            }
          );

          // Build chat request for orchestrator
          const chatMessages: ChatMessage[] = conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

          const currentAttachments: Attachment[] = attachments.map((att, index) => ({
            id: `att_${Date.now()}_${index}`,
            name: att.name,
            type: att.type,
            url: att.url,
            size: att.size || 0,
            uploadedAt: new Date().toISOString(),
          }));

          const orchestratorRequest: OrchestratorChatRequest = {
            userQuery: message,
            messages: chatMessages,
            currentAttachments: currentAttachments.length > 0 ? currentAttachments : undefined,
            sessionId,
            userId: userId || undefined,
            userEmail: authResult.user?.email || '',
            tenantId: tenantId || undefined,
          };

          // Execute the chat request with streaming
          const result = await orchestrator.processMessage(orchestratorRequest);

          // === AI CREDITS: Deduct credits based on token usage ===
          try {
            if (tenantId && userId && result.tokensUsed) {
              const creditService = container.get<AICreditService>(TYPES.AICreditService);

              // Calculate conversation turn (incrementing number for this session)
              const conversationTurn = conversationHistory.length / 2 + 1;

              // Count tool executions (if any)
              const toolCount = result.steps?.filter((step) => step.type === 'tool_use').length || 0;

              const deductionResult = await creditService.deductCredits(
                tenantId,
                userId,
                sessionId,
                conversationTurn,
                result.tokensUsed.input,
                result.tokensUsed.output,
                toolCount,
                'claude-sonnet-4-20250514'
              );

              if (!deductionResult.success) {
                console.error('[AI Chat] Failed to deduct credits:', deductionResult.error_message);
                // Log error but don't fail the user's request - they already got their response
              } else {
                console.log(
                  `[AI Chat] Credits deducted: ${deductionResult.credits_deducted}. ` +
                  `New balance: ${deductionResult.new_balance}`
                );
              }
            }
          } catch (creditError) {
            console.error('[AI Chat] Credit deduction error:', creditError);
            // Non-blocking - don't fail the user request
          }

          // Close the stream
          if (!controllerClosed) {
            controllerClosed = true;
            try {
              controller.close();
            } catch (closeError) {
              console.log('[AI Chat API] Controller already closed on completion');
            }
          }
        } catch (error: any) {
          console.error('[AI Chat API] Streaming error:', error);

          // Send error event to client if controller is still open
          if (!controllerClosed) {
            try {
              const errorEvent = `data: ${JSON.stringify({
                type: 'error',
                error: error.message || 'An error occurred while processing your message',
              })}\n\n`;

              controller.enqueue(new TextEncoder().encode(errorEvent));
            } catch (enqueueError) {
              console.log('[AI Chat API] Could not enqueue error (controller closed):', enqueueError);
            }
          }

          // Close controller only if not already closed
          if (!controllerClosed) {
            controllerClosed = true;
            try {
              controller.close();
            } catch (closeError) {
              console.log('[AI Chat API] Could not close controller (already closed):', closeError);
            }
          }
        }
      },

      cancel() {
        console.log('[AI Chat API] Stream cancelled by client');
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

    // Return JSON error response
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
