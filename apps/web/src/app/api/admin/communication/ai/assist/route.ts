/**
 * API Route: POST /api/admin/communication/ai/assist
 *
 * AI-powered assistance for message composition.
 * Uses CommunicationAIService to improve content, suggest subject lines,
 * personalize messages, fix grammar, and shorten content.
 *
 * Supports multimodal content - can analyze images embedded in messages
 * when extractImages option is enabled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ICommunicationAIService, ToneType, AssistType, ImageData } from '@/services/communication/CommunicationAIService';

interface AssistRequest {
  type: AssistType;
  content: string;
  /** Enable image extraction from HTML content */
  extractImages?: boolean;
  /** Pre-extracted images (base64 encoded) */
  images?: ImageData[];
  context?: {
    subject?: string;
    recipientCount?: number;
    channel?: 'email' | 'sms' | 'both';
    tone?: ToneType;
    maxLength?: number;
    purpose?: string;
    audience?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const body: AssistRequest = await request.json();

    // Validate request
    if (!body.type || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Type and content are required' },
        { status: 400 }
      );
    }

    const validTypes: AssistType[] = ['improve', 'subject', 'personalize', 'grammar', 'shorten'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assist type' },
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

    let response: { result: string; suggestions?: string[]; tokensUsed: number; changes?: string[] };

    // Prepare AI assist options with image support
    const aiOptions = {
      extractImages: body.extractImages ?? false,
      images: body.images,
    };

    switch (body.type) {
      case 'subject': {
        const result = await aiService.suggestSubjectLines(
          body.content,
          {
            purpose: body.context?.purpose,
            audience: body.context?.audience,
          },
          tenantId,
          aiOptions
        );
        response = {
          result: result.data[0]?.text ?? '',
          suggestions: result.data.map((s) => s.text),
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'improve': {
        const tone: ToneType = body.context?.tone ?? 'friendly';
        const result = await aiService.improveContent(body.content, tone, tenantId, aiOptions);
        response = {
          result: result.data.improved,
          changes: result.data.changes,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'personalize': {
        // For personalization, we just add placeholders - no AI needed
        const result = await aiService.personalizeMessage(
          body.content,
          {}, // Empty recipient data - returns template with placeholders
          tenantId
        );
        // Add standard placeholders if not present
        let personalizedContent = result.data;
        if (!personalizedContent.includes('{{first_name}}')) {
          personalizedContent = personalizedContent.replace(
            /^(Dear |Hello |Hi )?/i,
            'Dear {{first_name}}, '
          );
        }
        response = {
          result: personalizedContent,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'grammar': {
        const result = await aiService.fixGrammar(body.content, tenantId, aiOptions);
        response = {
          result: result.data,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'shorten': {
        const maxLength = body.context?.maxLength ?? (body.context?.channel === 'sms' ? 160 : 500);
        const result = await aiService.shortenContent(body.content, maxLength, tenantId, aiOptions);
        response = {
          result: result.data,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid assist type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('[Communication AI] Error in AI assist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI assistance failed',
      },
      { status: 500 }
    );
  }
}
