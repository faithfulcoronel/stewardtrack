/**
 * API Route: POST /api/admin/communication/ai/send-time
 *
 * AI-powered send time suggestion for message campaigns.
 * Suggests optimal send times based on message type and audience.
 * @requires communication:manage permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ICommunicationAIService } from '@/services/communication/CommunicationAIService';

interface SendTimeRequest {
  messageType: string;
  audience: string;
}

/**
 * POST /api/admin/communication/ai/send-time
 *
 * AI-powered send time suggestion
 * @requires communication:manage permission
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('communication:manage', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const body: SendTimeRequest = await request.json();

    // Validate request
    if (!body.messageType) {
      return NextResponse.json(
        { success: false, error: 'Message type is required' },
        { status: 400 }
      );
    }

    // Get CommunicationAIService from container
    const aiService = container.get<ICommunicationAIService>(TYPES.CommunicationAIService);

    // Check AI credits
    const hasCredits = await aiService.checkCredits(tenantId);
    if (!hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient AI credits. Please add more credits to use AI assistance.',
        },
        { status: 402 }
      );
    }

    // Get send time suggestion
    const result = await aiService.suggestSendTime(
      body.messageType,
      body.audience || 'general church members',
      tenantId
    );

    return NextResponse.json({
      success: true,
      suggestedTime: result.data.suggestedTime,
      reasoning: result.data.reasoning,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('[Communication AI] Error in send time suggestion:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Send time suggestion failed',
      },
      { status: 500 }
    );
  }
}
