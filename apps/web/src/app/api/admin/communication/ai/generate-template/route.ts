/**
 * API Route: POST /api/admin/communication/ai/generate-template
 *
 * Generate a message template using AI based on user prompt.
 * @requires communication:manage permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import type { ICommunicationAIService, ToneType } from '@/services/communication/CommunicationAIService';

interface GenerateTemplateRequest {
  prompt: string;
  category?: string;
  channels?: ('email' | 'sms')[];
  tone?: ToneType;
}

/**
 * POST /api/admin/communication/ai/generate-template
 *
 * AI-powered template generation
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

    const body: GenerateTemplateRequest = await request.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const aiService = container.get<ICommunicationAIService>(TYPES.CommunicationAIService);

    // Check credits first
    const hasCredits = await aiService.checkCredits(tenantId);
    if (!hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient AI credits. Please add more credits to use AI features.' },
        { status: 402 }
      );
    }

    // Determine channels
    const channels = body.channels ?? ['email'];
    const includeEmail = channels.includes('email');
    const includeSms = channels.includes('sms');
    const channel = includeSms && includeEmail ? 'both' : includeSms ? 'sms' : 'email';

    // Build purpose string from prompt and category
    const categoryContext = body.category && body.category !== 'custom'
      ? ` (Category: ${body.category} message)`
      : '';
    const purpose = `${body.prompt}${categoryContext}`;

    // Generate the template
    const result = await aiService.generateMessage(
      purpose,
      {
        tone: body.tone ?? 'friendly',
        channel,
        audience: 'church congregation members',
      },
      tenantId
    );

    // Extract name from the prompt (first few words or up to first comma)
    const words = body.prompt.split(/[,.\n]/)[0].split(' ').slice(0, 5).join(' ');
    const suggestedName = words.length > 3
      ? `${words}...`
      : words;

    return NextResponse.json({
      success: true,
      name: suggestedName || 'New Template',
      description: body.prompt.substring(0, 200),
      subject: result.data.subject || '',
      contentHtml: result.data.bodyHtml || result.data.bodyText || '',
      contentText: result.data.smsText || result.data.bodyText || '',
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('[AI Template Generation] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate template' },
      { status: 500 }
    );
  }
}
