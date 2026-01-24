/**
 * API Route: POST /api/admin/communication/ai/send-time
 *
 * AI-powered send time suggestion for message campaigns.
 * Suggests optimal send times based on message type and audience.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ICommunicationAIService } from '@/services/communication/CommunicationAIService';

interface SendTimeRequest {
  messageType: string;
  audience: string;
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
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
